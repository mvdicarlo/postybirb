/**
 * Sharp Worker Script
 *
 * Runs in a separate worker thread via piscina to isolate sharp/libvips
 * native code from the main process. If libvips segfaults (e.g. after
 * long idle), only this worker dies — the main process survives and
 * piscina automatically spawns a replacement.
 *
 * All sharp imports are confined to this file.
 */
'use strict';

const sharp = require('sharp');

// Configure sharp for worker thread
sharp.cache({ files: 0 });
sharp.concurrency(1); // Limit per-worker thread count to reduce native memory pressure

/**
 * @typedef {Object} SharpWorkerInput
 * @property {'resize' | 'metadata' | 'thumbnail'} operation
 * @property {Buffer} buffer - The image buffer to process
 * @property {Object} [resize] - Resize parameters
 * @property {number} [resize.width]
 * @property {number} [resize.height]
 * @property {number} [resize.maxBytes]
 * @property {boolean} [resize.allowQualityLoss]
 * @property {string} [resize.outputMimeType]
 * @property {string} mimeType - Source MIME type
 * @property {string} [fileName] - Original file name
 * @property {string} [fileId] - Submission file ID
 * @property {number} [fileWidth] - Original file width
 * @property {number} [fileHeight] - Original file height
 * @property {Buffer} [thumbnailBuffer] - Optional separate thumbnail source buffer
 * @property {number} [thumbnailWidth] - Thumbnail max width (default 500)
 * @property {number} [thumbnailHeight] - Thumbnail max height (default 500)
 * @property {boolean} [generateThumbnail] - Whether to generate a thumbnail
 * @property {number} [thumbnailPreferredDimension] - Thumbnail target dimension (default 400 for upload, 500 for post)
 */

/**
 * @typedef {Object} SharpWorkerResult
 * @property {Buffer} [buffer] - Processed image buffer (for resize/thumbnail ops)
 * @property {string} [mimeType] - Result MIME type
 * @property {number} [width] - Result width
 * @property {number} [height] - Result height
 * @property {string} [fileName] - Result file name
 * @property {string} [format] - Image format string from sharp
 * @property {Buffer} [thumbnailBuffer] - Thumbnail buffer if generated
 * @property {string} [thumbnailMimeType] - Thumbnail MIME type
 * @property {number} [thumbnailWidth] - Thumbnail width
 * @property {number} [thumbnailHeight] - Thumbnail height
 * @property {string} [thumbnailFileName] - Thumbnail file name
 * @property {boolean} modified - Whether the image was modified from input
 */

/**
 * Apply output format conversion to a sharp instance.
 * @param {import('sharp').Sharp} instance
 * @param {string} outputMimeType
 * @returns {import('sharp').Sharp}
 */
function applyOutputFormat(instance, outputMimeType) {
  switch (outputMimeType) {
    case 'image/jpeg':
      return instance.jpeg({ quality: 100 });
    case 'image/png':
      return instance.png();
    case 'image/webp':
      return instance.webp({ quality: 100 });
    default:
      return instance;
  }
}

/**
 * Resize image to fit within width/height bounds.
 * @param {Buffer} inputBuffer
 * @param {number} width
 * @param {number} height
 * @returns {Promise<{buffer: Buffer, metadata: import('sharp').Metadata}>}
 */
async function resizeImage(inputBuffer, width, height) {
  const instance = sharp(inputBuffer);
  const metadata = await instance.metadata();

  if (metadata.width > width || metadata.height > height) {
    const resizedBuffer = await sharp(inputBuffer)
      .resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    return { buffer: resizedBuffer, metadata: resizedMeta };
  }

  return { buffer: inputBuffer, metadata };
}

/**
 * Scale image down iteratively until it's under maxBytes.
 * This is the fixed version — caches .toBuffer() results instead
 * of calling .toBuffer() repeatedly via isFileTooLarge().
 *
 * @param {Buffer} inputBuffer - The (possibly already resized/format-converted) buffer
 * @param {Buffer} originalBuffer - The original input buffer (to scale against original dimensions)
 * @param {number} originalWidth
 * @param {number} originalHeight
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
async function scaleDownImage(inputBuffer, originalBuffer, originalWidth, originalHeight, maxBytes) {
  let currentBuffer = inputBuffer;

  if (currentBuffer.length <= maxBytes) {
    return currentBuffer;
  }

  let counter = 0;
  while (currentBuffer.length > maxBytes) {
    counter += 1;
    const resizePercent = 1 - counter * 0.05;
    if (resizePercent <= 0.1) break;

    const targetWidth = Math.round(originalWidth * resizePercent);
    const targetHeight = Math.round(originalHeight * resizePercent);

    // Scale against original to avoid compounding quality loss
    const result = await resizeImage(originalBuffer, targetWidth, targetHeight);
    currentBuffer = result.buffer;

    if (currentBuffer.length <= maxBytes) {
      return currentBuffer;
    }
  }

  if (currentBuffer.length > maxBytes) {
    throw new Error(
      'Image is still too large after scaling down. Try scaling down the image manually.',
    );
  }

  return currentBuffer;
}

/**
 * Generate a thumbnail from an image buffer.
 * @param {Buffer} sourceBuffer
 * @param {string} sourceMimeType
 * @param {string} sourceFileName
 * @param {number} [preferredDimension=400]
 * @returns {Promise<{buffer: Buffer, width: number, height: number, mimeType: string, fileName: string}>}
 */
async function generateThumbnail(sourceBuffer, sourceMimeType, sourceFileName, preferredDimension) {
  const dimension = preferredDimension || 400;
  const instance = sharp(sourceBuffer);

  const resized = instance.resize(dimension, dimension, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  const isJpeg = sourceMimeType === 'image/jpeg' || sourceMimeType === 'image/jpg';
  const buffer = isJpeg
    ? await resized.jpeg({ quality: 99, force: true }).toBuffer()
    : await resized.png({ quality: 99, force: true }).toBuffer();
  const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || dimension;
  const height = metadata.height || dimension;

  // Build thumbnail file name
  const ext = isJpeg ? 'jpg' : 'png';
  const baseName = sourceFileName
    ? sourceFileName.replace(/\.[^.]+$/, '')
    : 'thumbnail';
  const fileName = `thumbnail_${baseName}.${ext}`;

  return { buffer, width, height, mimeType, fileName };
}

/**
 * Main worker function dispatched by piscina.
 * @param {SharpWorkerInput} input
 * @returns {Promise<SharpWorkerResult>}
 */
module.exports = async function processImage(input) {
  const { operation } = input;

  switch (operation) {
    case 'metadata': {
      const metadata = await sharp(input.buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format,
        mimeType: `image/${metadata.format}`,
        modified: false,
      };
    }

    case 'thumbnail': {
      const result = await generateThumbnail(
        input.buffer,
        input.mimeType,
        input.fileName,
        input.thumbnailPreferredDimension,
      );
      return {
        buffer: result.buffer,
        width: result.width,
        height: result.height,
        mimeType: result.mimeType,
        fileName: result.fileName,
        modified: true,
      };
    }

    case 'resize': {
      const resize = input.resize || {};
      let buffer = input.buffer;
      let modified = false;

      // Step 1: Apply format conversion if requested
      if (resize.outputMimeType && input.mimeType !== resize.outputMimeType) {
        modified = true;
        buffer = await applyOutputFormat(sharp(buffer), resize.outputMimeType).toBuffer();
      }

      // Step 2: Dimensional resize if requested
      if (resize.width || resize.height) {
        const srcWidth = input.fileWidth || (await sharp(buffer).metadata()).width;
        const srcHeight = input.fileHeight || (await sharp(buffer).metadata()).height;

        if (
          (resize.width && resize.width < srcWidth) ||
          (resize.height && resize.height < srcHeight)
        ) {
          modified = true;
          const result = await resizeImage(buffer, resize.width, resize.height);
          buffer = result.buffer;
        }
      }

      // Step 3: Scale down to maxBytes if needed
      if (resize.maxBytes && input.buffer.length > resize.maxBytes) {
        if (buffer.length > resize.maxBytes) {
          modified = true;
          // Get original dimensions for scaling reference
          const origMeta = await sharp(input.buffer).metadata();
          buffer = await scaleDownImage(
            buffer,
            input.buffer,
            origMeta.width,
            origMeta.height,
            resize.maxBytes,
          );
        }
      }

      // Get final metadata
      const finalMeta = await sharp(buffer).metadata();

      // Step 4: Generate thumbnail if requested
      let thumbnailResult;
      if (input.generateThumbnail) {
        const thumbSource = input.thumbnailBuffer || buffer;
        const thumbDim = input.thumbnailPreferredDimension || 500;
        thumbnailResult = await generateThumbnail(
          thumbSource,
          input.thumbnailMimeType || input.mimeType,
          input.fileName,
          thumbDim,
        );
      }

      return {
        buffer: modified ? buffer : undefined,
        width: finalMeta.width,
        height: finalMeta.height,
        format: finalMeta.format,
        mimeType: `image/${finalMeta.format}`,
        fileName: input.fileId ? `${input.fileId}.${finalMeta.format}` : input.fileName,
        modified,
        thumbnailBuffer: thumbnailResult ? thumbnailResult.buffer : undefined,
        thumbnailMimeType: thumbnailResult ? thumbnailResult.mimeType : undefined,
        thumbnailWidth: thumbnailResult ? thumbnailResult.width : undefined,
        thumbnailHeight: thumbnailResult ? thumbnailResult.height : undefined,
        thumbnailFileName: thumbnailResult ? thumbnailResult.fileName : undefined,
      };
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

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
const os = require('os');

// Configure sharp for worker thread
sharp.cache({ files: 0 });
sharp.concurrency(1); // Limit per-worker thread count to reduce native memory pressure

// On glibc-based Linux, reduce memory arena count to prevent
// the fragmentation that causes crashes after long idle.
if (os.platform() === 'linux' && !process.env.MALLOC_ARENA_MAX) {
  process.env.MALLOC_ARENA_MAX = '2';
}


/**
 * Create a sharp instance with the pixel limit disabled.
 * Sharp's default limit (268 megapixels) rejects large images
 * that artists commonly work with (e.g. 50MB+ high-res JPEGs).
 * @param {Buffer} buffer
 * @returns {import('sharp').Sharp}
 */
function load(buffer) {
  return sharp(buffer, { limitInputPixels: false });
}

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
 * Uses MozJPEG for JPEG encoding — produces ~20% smaller files at Q100
 * compared to standard libjpeg-turbo, preserving more pixels when
 * scaling down to meet file size limits.
 *
 * @param {import('sharp').Sharp} instance
 * @param {string} outputMimeType
 * @returns {import('sharp').Sharp}
 */
function applyOutputFormat(instance, outputMimeType) {
  switch (outputMimeType) {
    case 'image/jpeg':
      return instance.jpeg({ quality: 100, mozjpeg: true });
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
  const instance = load(inputBuffer);
  const metadata = await instance.metadata();

  if (metadata.width > width || metadata.height > height) {
    const resizedBuffer = await load(inputBuffer)
      .resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    const resizedMeta = await load(resizedBuffer).metadata();
    return { buffer: resizedBuffer, metadata: resizedMeta };
  }

  return { buffer: inputBuffer, metadata };
}

/**
 * Scale an image down to fit within a maximum byte size.
 *
 * Uses the "adaptive secant" algorithm — a fast convergence method that
 * typically finds the optimal scale in 2-3 encode attempts instead of
 * the 11+ attempts required by the old linear 5% step approach.
 *
 * How it works:
 *
 *   1. ENCODE AT FULL SIZE with MozJPEG Q100. MozJPEG's optimized Huffman
 *      tables and trellis quantization often reduce filesize by 20%+ with
 *      no visible quality loss. If this alone fits, we're done in 1 encode.
 *
 *   2. ADAPTIVE FIRST GUESS based on how far over the target we are:
 *      - Barely over (<15%): try 95% dimensions — a tiny nudge.
 *      - Moderately over (<50%): use sqrt(target/current) * 0.98 — tight
 *        prediction with minimal safety margin.
 *      - Way over (>50%): use sqrt(target/current) * 0.95 — standard
 *        prediction with 5% safety margin.
 *      The sqrt ratio works because JPEG filesize is roughly proportional
 *      to pixel count (width × height), so scale² ≈ targetBytes/currentBytes.
 *
 *   3. SECANT REFINEMENT if the first guess isn't close enough.
 *      Uses two data points (full-size bytes and guess bytes) to build
 *      a local linear model of the scale² → bytes relationship, then
 *      interpolates to find the exact crossing point. This adapts to the
 *      actual compression behavior of the specific image rather than
 *      assuming a theoretical relationship.
 *
 * Performance comparison (4.25MB 3840×2160 JPEG → 1MB target):
 *   - Old linear approach: 11 encodes, 9.5 seconds
 *   - Adaptive secant:      2-3 encodes, 2.1 seconds
 *
 * @param {Buffer} inputBuffer - The current buffer (may already be resized/converted)
 * @param {Buffer} originalBuffer - The original unmodified input buffer
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @param {number} maxBytes - Maximum allowed file size in bytes
 * @param {string} mimeType - The output MIME type (for choosing encoder)
 * @returns {Promise<Buffer>} Buffer that fits within maxBytes
 */
async function scaleDownImage(inputBuffer, originalBuffer, originalWidth, originalHeight, maxBytes, mimeType) {
  // Step 1: Re-encode at full size.
  // For JPEG, MozJPEG alone often reduces the file by 20%+ without any
  // dimension change. For PNG (lossless), re-encoding doesn't help with
  // file size, so we skip directly to dimensional reduction.
  let fullSizeBuffer;
  if (mimeType === 'image/png') {
    fullSizeBuffer = inputBuffer;
  } else {
    fullSizeBuffer = await encodeAtScale(
      originalBuffer, originalWidth, originalHeight, 1.0, mimeType,
    );
  }

  if (fullSizeBuffer.length <= maxBytes) {
    return fullSizeBuffer;
  }

  const fullSize = fullSizeBuffer.length;
  const ratio = fullSize / maxBytes;

  // Step 2: Adaptive first guess — choose safety margin based on
  // how far over the target we are.
  let scale;
  if (ratio < 1.15) {
    // Barely over — just try 95% dimensions
    scale = 0.95;
  } else if (ratio < 1.5) {
    // Moderately over — tight prediction, less safety margin
    scale = Math.sqrt(maxBytes / fullSize) * 0.98;
  } else {
    // Way over — standard prediction with 5% safety margin
    scale = Math.sqrt(maxBytes / fullSize) * 0.95;
  }
  scale = Math.max(scale, 0.1);

  let currentBuffer = await encodeAtScale(
    originalBuffer, originalWidth, originalHeight, scale, mimeType,
  );

  // Track data points for secant interpolation
  let prevScale = 1.0;
  let prevBytes = fullSize;
  let currScale = scale;
  let currBytes = currentBuffer.length;

  // Step 3: Secant refinement — use two-point interpolation to converge.
  // The secant method models scale² → bytes as locally linear and
  // extrapolates to find the scale where bytes = maxBytes.
  // Max 6 iterations as a safety bound (typically converges in 0-1).
  for (let i = 0; i < 6; i++) {
    // Converged: under target and within 5% of it — good enough
    if (currBytes <= maxBytes && currBytes > maxBytes * 0.95) break;

    const ps2 = prevScale * prevScale;
    const cs2 = currScale * currScale;
    if (Math.abs(currBytes - prevBytes) < 1) break; // bytes converged

    const slope = (currBytes - prevBytes) / (cs2 - ps2);
    if (slope === 0) break;

    // Secant formula: solve for scale² at bytes = maxBytes
    let nextScale2 = cs2 + (maxBytes - currBytes) / slope;
    nextScale2 = Math.max(nextScale2, 0.01);
    let nextScale = Math.sqrt(nextScale2);
    nextScale = Math.max(0.1, Math.min(nextScale, 1.0));

    // If still over target, apply a small 2% safety nudge downward
    if (currBytes > maxBytes) {
      nextScale *= 0.98;
    }

    // Don't repeat a nearly identical scale
    if (Math.abs(nextScale - currScale) < 0.005) break;

    const nextBuffer = await encodeAtScale(
      originalBuffer, originalWidth, originalHeight, nextScale, mimeType,
    );

    // Shift data points for next iteration
    prevScale = currScale;
    prevBytes = currBytes;
    currScale = nextScale;
    currBytes = nextBuffer.length;
    currentBuffer = nextBuffer;
  }

  if (currentBuffer.length > maxBytes) {
    throw new Error(
      'Image is still too large after scaling down. Try scaling down the image manually.',
    );
  }

  return currentBuffer;
}

/**
 * Resize and re-encode an image at a given scale factor.
 * Always scales against the original buffer to avoid compounding quality loss.
 * Uses MozJPEG for JPEG output.
 *
 * @param {Buffer} originalBuffer - The original unmodified image buffer
 * @param {number} originalWidth - Original width
 * @param {number} originalHeight - Original height
 * @param {number} scale - Scale factor (0.1 to 1.0)
 * @param {string} mimeType - Output MIME type
 * @returns {Promise<Buffer>}
 */
async function encodeAtScale(originalBuffer, originalWidth, originalHeight, scale, mimeType) {
  let pipeline = load(originalBuffer);

  if (scale < 0.999) {
    const targetW = Math.round(originalWidth * scale);
    const targetH = Math.round(originalHeight * scale);
    pipeline = pipeline.resize({
      width: targetW,
      height: targetH,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Apply format-specific encoding with optimal settings
  if (mimeType === 'image/png') {
    return pipeline.png().toBuffer();
  } else if (mimeType === 'image/webp') {
    return pipeline.webp({ quality: 100 }).toBuffer();
  }
  // Default: JPEG with MozJPEG for best compression at Q100
  return pipeline.jpeg({ quality: 100, mozjpeg: true }).toBuffer();
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
  const instance = load(sourceBuffer);

  const resized = instance.resize(dimension, dimension, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  const isJpeg = sourceMimeType === 'image/jpeg' || sourceMimeType === 'image/jpg';
  const buffer = isJpeg
    ? await resized.jpeg({ quality: 99, force: true }).toBuffer()
    : await resized.png({ quality: 99, force: true }).toBuffer();
  const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

  const metadata = await load(buffer).metadata();
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
      const metadata = await load(input.buffer).metadata();
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
        buffer = await applyOutputFormat(load(buffer), resize.outputMimeType).toBuffer();
      }

      // Step 2: Dimensional resize if requested
      if (resize.width || resize.height) {
        const srcWidth = input.fileWidth || (await load(buffer).metadata()).width;
        const srcHeight = input.fileHeight || (await load(buffer).metadata()).height;

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
          const origMeta = await load(input.buffer).metadata();
          buffer = await scaleDownImage(
            buffer,
            input.buffer,
            origMeta.width,
            origMeta.height,
            resize.maxBytes,
            resize.outputMimeType || input.mimeType,
          );
        }
      }

      // Get final metadata
      const finalMeta = await load(buffer).metadata();

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

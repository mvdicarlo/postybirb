/* eslint-disable max-classes-per-file */
import { ImagePool } from '@squoosh/lib';
import { readFileSync } from 'fs';

// Create a shared ImagePool instance
let imagePool: ImagePool | null = null;

export class ImageUtil {
  static isImage(mimetype: string, includeGIF = false): boolean {
    if (includeGIF && mimetype === 'image/gif') {
      return true;
    }

    return mimetype.startsWith('image/') && mimetype !== 'image/gif';
  }

  static async getMetadata(bufferOrPath: Buffer | string) {
    const buffer = typeof bufferOrPath === 'string' 
      ? readFileSync(bufferOrPath) 
      : bufferOrPath;
    
    const pool = await ImageUtil.getImagePool();
    const image = pool.ingestImage(buffer);
    
    try {
      const decoded = await image.decoded;
      return {
        width: decoded.bitmap.width,
        height: decoded.bitmap.height,
        format: ImageUtil.getFormatFromBuffer(buffer),
        hasAlpha: ImageUtil.hasAlphaChannel(decoded.bitmap),
      };
    } finally {
      // The pool will handle cleanup
    }
  }

  static load(bufferOrPath: Buffer | string) {
    const buffer = typeof bufferOrPath === 'string' 
      ? readFileSync(bufferOrPath) 
      : bufferOrPath;
    
    return new SquooshInstance(buffer);
  }

  static async getImagePool() {
    if (!imagePool) {
      imagePool = new ImagePool(4); // Use 4 threads
    }
    return imagePool;
  }

  static getFormatFromBuffer(buffer: Buffer): string {
    // Check for common image format magic bytes
    if (buffer.length >= 4) {
      const [firstByte, secondByte, thirdByte, fourthByte] = buffer.subarray(0, 4);
      if (firstByte === 0x89 && secondByte === 0x50 && thirdByte === 0x4e && fourthByte === 0x47) {
        return 'png';
      }
      if (firstByte === 0xff && secondByte === 0xd8 && thirdByte === 0xff) {
        return 'jpeg';
      }
      if (firstByte === 0x47 && secondByte === 0x49 && thirdByte === 0x46 && fourthByte === 0x38) {
        return 'gif';
      }
      if (firstByte === 0x52 && secondByte === 0x49 && thirdByte === 0x46 && fourthByte === 0x46) {
        return 'webp';
      }
    }
    return 'unknown';
  }

  static hasAlphaChannel(bitmap: { data: Uint8ClampedArray }): boolean {
    // Check if any pixel has alpha < 255
    const { data } = bitmap;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    return false;
  }

  static async cleanup() {
    if (imagePool) {
      await imagePool.close();
      imagePool = null;
    }
  }
}

// Sharp-compatible wrapper for @squoosh/lib
class SquooshInstance {
  public buffer: Buffer;

  private currentFormat: string;

  private cachedMetadata?: { width: number; height: number; format: string; hasAlpha: boolean };

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.currentFormat = ImageUtil.getFormatFromBuffer(buffer);
  }

  async metadata() {
    if (this.cachedMetadata) {
      return this.cachedMetadata;
    }

    const pool = await ImageUtil.getImagePool();
    const image = pool.ingestImage(this.buffer);
    
    try {
      const decoded = await image.decoded;
      this.cachedMetadata = {
        width: decoded.bitmap.width,
        height: decoded.bitmap.height,
        format: this.currentFormat,
        hasAlpha: ImageUtil.hasAlphaChannel(decoded.bitmap),
      };
      
      return this.cachedMetadata;
    } finally {
      // The pool will handle cleanup
    }
  }

  resize(options: { width?: number; height?: number; fit?: string } | number, height?: number): ResizeOperation {
    const resizeOptions = typeof options === 'number' 
      ? { width: options, height } 
      : options;
      
    return new ResizeOperation(this, resizeOptions);
  }

  png(options?: { quality?: number; force?: boolean }): FormatOperation {
    return new FormatOperation(this, 'png', options);
  }

  jpeg(options?: { quality?: number; force?: boolean }): FormatOperation {
    return new FormatOperation(this, 'jpeg', options);
  }

  async toBuffer() {
    return this.buffer;
  }
}

class ResizeOperation {
  public instance: SquooshInstance;

  public resizeOptions: { width?: number; height?: number; fit?: string };

  constructor(instance: SquooshInstance, resizeOptions: { width?: number; height?: number; fit?: string }) {
    this.instance = instance;
    this.resizeOptions = resizeOptions;
  }

  resize(options: { width?: number; height?: number; fit?: string } | number, height?: number): ResizeOperation {
    const resizeOptions = typeof options === 'number' 
      ? { width: options, height } 
      : options;
      
    return new ResizeOperation(this.instance, resizeOptions);
  }

  png(options?: { quality?: number; force?: boolean }): FormatOperation {
    return new FormatOperation(this, 'png', options);
  }

  jpeg(options?: { quality?: number; force?: boolean }): FormatOperation {
    return new FormatOperation(this, 'jpeg', options);
  }

  async toBuffer() {
    const pool = await ImageUtil.getImagePool();
    const image = pool.ingestImage(this.instance.buffer);
    
    try {
      const decoded = await image.decoded;
      
      // Calculate resize dimensions
      let { width, height } = this.resizeOptions;
      const originalWidth = decoded.bitmap.width;
      const originalHeight = decoded.bitmap.height;
      
      if (width && height) {
        // Both specified - use as-is or calculate based on fit
        if (this.resizeOptions.fit === 'inside') {
          const widthRatio = width / originalWidth;
          const heightRatio = height / originalHeight;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(originalWidth * ratio);
          height = Math.round(originalHeight * ratio);
        }
      } else if (width) {
        // Only width specified - maintain aspect ratio
        const ratio = width / originalWidth;
        height = Math.round(originalHeight * ratio);
      } else if (height) {
        // Only height specified - maintain aspect ratio
        const ratio = height / originalHeight;
        width = Math.round(originalWidth * ratio);
      }

      // Perform resize
      await image.preprocess({
        resize: {
          width: width!,
          height: height!,
        },
      });

      // Encode to original format
      const format = ImageUtil.getFormatFromBuffer(this.instance.buffer);
      const encoderOptions = format === 'png' ? { oxipng: {} } : { mozjpeg: {} };
      await image.encode(encoderOptions);

      const encoded = await image.encodedWith[format === 'png' ? 'oxipng' : 'mozjpeg'];
      return Buffer.from(encoded!.binary);
    } finally {
      // The pool will handle cleanup
    }
  }

  async metadata() {
    const pool = await ImageUtil.getImagePool();
    const image = pool.ingestImage(this.instance.buffer);
    
    try {
      const decoded = await image.decoded;
      
      // Calculate resize dimensions
      let { width, height } = this.resizeOptions;
      const originalWidth = decoded.bitmap.width;
      const originalHeight = decoded.bitmap.height;
      
      if (width && height) {
        // Both specified - use as-is or calculate based on fit
        if (this.resizeOptions.fit === 'inside') {
          const widthRatio = width / originalWidth;
          const heightRatio = height / originalHeight;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(originalWidth * ratio);
          height = Math.round(originalHeight * ratio);
        }
      } else if (width) {
        // Only width specified - maintain aspect ratio
        const ratio = width / originalWidth;
        height = Math.round(originalHeight * ratio);
      } else if (height) {
        // Only height specified - maintain aspect ratio
        const ratio = height / originalHeight;
        width = Math.round(originalWidth * ratio);
      }

      return {
        width: width!,
        height: height!,
        format: ImageUtil.getFormatFromBuffer(this.instance.buffer),
        hasAlpha: ImageUtil.hasAlphaChannel(decoded.bitmap),
      };
    } finally {
      // The pool will handle cleanup
    }
  }
}

class FormatOperation {
  private source: SquooshInstance | ResizeOperation;

  private format: string;

  private options: Record<string, unknown>;

  constructor(source: SquooshInstance | ResizeOperation, format: string, options?: Record<string, unknown>) {
    this.source = source;
    this.format = format;
    this.options = options || {};
  }

  resize(options: { width?: number; height?: number; fit?: string } | number, height?: number): ResizeOperation {
    const resizeOptions = typeof options === 'number' 
      ? { width: options, height } 
      : options;
      
    if (this.source instanceof SquooshInstance) {
      return new ResizeOperation(this.source, resizeOptions);
    }
    
    return new ResizeOperation(this.source.instance, resizeOptions);
  }

  png(options?: { quality?: number; force?: boolean }): FormatOperation {
    return new FormatOperation(this.source, 'png', options);
  }

  jpeg(options?: { quality?: number; force?: boolean }): FormatOperation {
    return new FormatOperation(this.source, 'jpeg', options);
  }

  async toBuffer() {
    const pool = await ImageUtil.getImagePool();
    const originalBuffer = this.source instanceof SquooshInstance 
      ? this.source.buffer 
      : this.source.instance.buffer;
    
    const image = pool.ingestImage(originalBuffer);
    
    try {
      // Apply resize if this is a resize operation
      if (this.source instanceof ResizeOperation) {
        const { width, height } = this.source.resizeOptions;
        if (width || height) {
          const decoded = await image.decoded;
          let finalWidth = width;
          let finalHeight = height;
          
          if (width && height) {
            if (this.source.resizeOptions.fit === 'inside') {
              const widthRatio = width / decoded.bitmap.width;
              const heightRatio = height / decoded.bitmap.height;
              const ratio = Math.min(widthRatio, heightRatio);
              finalWidth = Math.round(decoded.bitmap.width * ratio);
              finalHeight = Math.round(decoded.bitmap.height * ratio);
            }
          } else if (width) {
            const ratio = width / decoded.bitmap.width;
            finalHeight = Math.round(decoded.bitmap.height * ratio);
          } else if (height) {
            const ratio = height / decoded.bitmap.height;
            finalWidth = Math.round(decoded.bitmap.width * ratio);
          }

          await image.preprocess({
            resize: {
              width: finalWidth!,
              height: finalHeight!,
            },
          });
        }
      }

      // Encode to target format
      const encoderOptions = this.format === 'png' 
        ? { oxipng: {} } 
        : { mozjpeg: { quality: this.options.quality || 75 } };
      
      await image.encode(encoderOptions);

      const encoded = await image.encodedWith[this.format === 'png' ? 'oxipng' : 'mozjpeg'];
      return Buffer.from(encoded!.binary);
    } finally {
      // The pool will handle cleanup
    }
  }

  async metadata() {
    // For format operations, return metadata after potential resize
    if (this.source instanceof ResizeOperation) {
      const { width, height } = this.source.resizeOptions;
      if (width || height) {
        const pool = await ImageUtil.getImagePool();
        const image = pool.ingestImage(this.source.instance.buffer);
        
        try {
          const decoded = await image.decoded;
          let finalWidth = width;
          let finalHeight = height;
          
          if (width && height) {
            if (this.source.resizeOptions.fit === 'inside') {
              const widthRatio = width / decoded.bitmap.width;
              const heightRatio = height / decoded.bitmap.height;
              const ratio = Math.min(widthRatio, heightRatio);
              finalWidth = Math.round(decoded.bitmap.width * ratio);
              finalHeight = Math.round(decoded.bitmap.height * ratio);
            }
          } else if (width) {
            const ratio = width / decoded.bitmap.width;
            finalHeight = Math.round(decoded.bitmap.height * ratio);
          } else if (height) {
            const ratio = height / decoded.bitmap.height;
            finalWidth = Math.round(decoded.bitmap.width * ratio);
          }

          return {
            width: finalWidth,
            height: finalHeight,
            format: this.format,
            hasAlpha: ImageUtil.hasAlphaChannel(decoded.bitmap),
          };
        } finally {
          // The pool will handle cleanup
        }
      }
    }
    
    if (this.source instanceof SquooshInstance) {
      return this.source.metadata();
    }
    
    return this.source.instance.metadata();
  }
}

import sharp from 'sharp';

export class ImageUtil {
  static isImage(mimetype: string, includeGIF = false): boolean {
    if (includeGIF && mimetype === 'image/gif') {
      return true;
    }

    return mimetype.startsWith('image/') && mimetype !== 'image/gif';
  }

  static getMetadata(bufferOrPath: Buffer | string) {
    const image = sharp(bufferOrPath);
    return image.metadata();
  }

  static load(bufferOrPath: Buffer | string) {
    return sharp(bufferOrPath);
  }
}

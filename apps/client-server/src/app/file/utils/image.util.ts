import * as sharp from 'sharp';

export class ImageUtil {
  static isImage(mimetype: string, includeGIF: boolean = false): boolean {
    if (includeGIF && mimetype === 'image/gif') {
      return true;
    }

    return mimetype.startsWith('image/') && mimetype !== 'image/gif';
  }

  static getMetadata(bufferOrPath: Buffer | string) {
    const image = sharp(bufferOrPath);
    return image.metadata();
  }
}

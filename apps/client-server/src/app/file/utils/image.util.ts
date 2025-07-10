import { createSharpInstance, getSharpMetadata } from '../../../utils/sharp-loader';

export class ImageUtil {
  static isImage(mimetype: string, includeGIF = false): boolean {
    if (includeGIF && mimetype === 'image/gif') {
      return true;
    }

    return mimetype.startsWith('image/') && mimetype !== 'image/gif';
  }

  static async getMetadata(bufferOrPath: Buffer | string) {
    return getSharpMetadata(bufferOrPath);
  }

  static async load(bufferOrPath: Buffer | string) {
    return createSharpInstance(bufferOrPath);
  }
}

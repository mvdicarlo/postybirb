/**
 * Utility class for image-related checks.
 *
 * NOTE: Sharp image processing has been moved to SharpInstanceManager
 * which runs sharp in isolated worker threads for crash protection.
 * The load() and getMetadata() methods have been removed.
 * Use SharpInstanceManager.getMetadata() or SharpInstanceManager.resizeForPost() instead.
 */
export class ImageUtil {
  static isImage(mimetype: string, includeGIF = false): boolean {
    if (includeGIF && mimetype === 'image/gif') {
      return true;
    }

    return mimetype.startsWith('image/') && mimetype !== 'image/gif';
  }
}

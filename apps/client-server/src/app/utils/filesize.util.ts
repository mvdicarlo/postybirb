/**
 * Defines simple file size conversion methods
 * @class FileSize
 */
export default class FileSize {
  static mbToBytes(size: number): number {
    return size * 1048576;
  }

  static bytesToMB(size: number): number {
    return size / 1048576;
  }
}

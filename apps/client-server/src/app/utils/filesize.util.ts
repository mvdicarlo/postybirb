/**
 * Defines simple file size conversion methods
 * @class FileSize
 */
export default class FileSize {
  static megabytes(size: number): number {
    return size * 1048576;
  }

  static bytesToMB(size: number): number {
    return size / 1048576;
  }
}

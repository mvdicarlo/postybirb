/**
 * Defines simple file size conversion methods
 * @class FileSize
 */
export default class FileSize {
  static MBtoBytes(size: number): number {
    return size * 1048576;
  }

  static BytesToMB(size: number): number {
    return size / 1048576;
  }
}

import { IFileBuffer } from '@postybirb/types';

export interface IFileConverter {
  /**
   * Determines if the file can be converted to any of the allowable output mime types.
   *
   * @param {IFileBuffer} file
   * @param {string[]} allowableOutputMimeTypes
   * @return {*}  {boolean}
   */
  canConvert(file: IFileBuffer, allowableOutputMimeTypes: string[]): boolean;

  /**
   * Converts the file to one of the allowable output mime types.
   *
   * @param {IFileBuffer} file
   * @param {string[]} allowableOutputMimeTypes
   * @return {*}  {Promise<IFileBuffer>}
   */
  convert(
    file: IFileBuffer,
    allowableOutputMimeTypes: string[],
  ): Promise<IFileBuffer>;
}

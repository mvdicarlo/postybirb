import { IFileTypeOrm } from './file';

export interface IFileData {
  id: string;
  buffer: Buffer;
  file: IFileTypeOrm;
  height: number;
  width: number;
  mimetype: string;
  filename: string;
}

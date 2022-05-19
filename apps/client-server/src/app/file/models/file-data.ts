import { IFile } from './file';

export interface IFileData {
  id: string;
  buffer: Buffer;
  file: IFile;
  height: number;
  width: number;
  mimetype: string;
  filename: string;
}

import { IFile } from './file.interface';

export interface IFileData {
  id: string;
  buffer: Buffer;
  file: IFile;
  height: number;
  width: number;
  mimetype: string;
  filename: string;
}

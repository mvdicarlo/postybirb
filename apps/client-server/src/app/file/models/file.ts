import { FileData } from '../entities/file-data.entity';
import { IFileBuffer } from './file-buffer';
import { FileDimensions } from './file-dimensions';

export interface ISubmissionFile extends FileDimensions {
  id: string;
  fileName: string;
  hash: string;
  mimeType: string;
  file: IFileBuffer;
  thumbnail: IFileBuffer;
  altFile: IFileBuffer | undefined;
}

// @deprecated
export interface IFileTypeOrm {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  height: number;
  width: number;
  // @todo figure out types
  modifiers: any[];
  data: Promise<FileData[]>; // Promise for lazy loading
  hash: string;
}

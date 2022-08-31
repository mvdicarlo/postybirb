import { FileSubmissionMetadata } from '../../submission/models/file-submission';
import { ISubmission } from '../../submission/models/submission';
import { FileData } from '../entities/file-data.entity';
import { IFileBuffer } from './file-buffer';
import { FileDimensions } from './file-dimensions';

export interface ISubmissionFile extends FileDimensions {
  id: string;
  submission: ISubmission<FileSubmissionMetadata>;
  fileName: string;
  hash: string;
  mimeType: string;
  file: IFileBuffer;
  thumbnail: IFileBuffer;
  altFile: IFileBuffer | undefined;
}

// TODO remove
export interface IFileTypeOrm {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  height: number;
  width: number;
  modifiers: any[];
  data: Promise<FileData[]>; // Promise for lazy loading
  hash: string;
}

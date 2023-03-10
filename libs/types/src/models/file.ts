import { IBaseEntity } from './base-entity';
import { IFileBuffer } from './file-buffer';
import { FileDimensions } from './file-dimensions';
import { FileSubmissionMetadata } from './file-submission';
import { ISubmission } from './submission';

export interface ISubmissionFile extends FileDimensions, IBaseEntity {
  id: string;
  submission: ISubmission<FileSubmissionMetadata>;
  fileName: string;
  hash: string;
  mimeType: string;
  file: IFileBuffer;
  thumbnail: IFileBuffer | undefined;
  altFile: IFileBuffer | undefined;
  hasThumbnail: boolean;
}

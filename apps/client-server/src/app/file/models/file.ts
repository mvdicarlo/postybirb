import { IBaseEntity } from '../../database/models/base-entity';
import { FileSubmissionMetadata } from '../../submission/models/file-submission';
import { ISubmission } from '../../submission/models/submission';
import { IFileBuffer } from './file-buffer';
import { FileDimensions } from './file-dimensions';

export interface ISubmissionFile extends FileDimensions, IBaseEntity {
  id: string;
  submission: ISubmission<FileSubmissionMetadata>;
  fileName: string;
  hash: string;
  mimeType: string;
  file: IFileBuffer;
  thumbnail: IFileBuffer;
  altFile: IFileBuffer | undefined;
}

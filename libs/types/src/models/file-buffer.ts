import { IBaseEntity } from './base-entity';
import { ISubmissionFile } from './submission-file';
import { FileDimensions } from './file-dimensions';

export type IFileBuffer = FileDimensions &
  IBaseEntity & {
    id: string;
    buffer: Buffer;
    parent: ISubmissionFile;
    fileName: string;
    mimeType: string;
  };

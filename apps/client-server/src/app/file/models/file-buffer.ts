import { IBaseEntity } from '../../database/models/base-entity';
import { ISubmissionFile } from './file';
import { FileDimensions } from './file-dimensions';

export type IFileBuffer = FileDimensions &
  IBaseEntity & {
    id: string;
    buffer: Buffer;
    parent: ISubmissionFile;
    fileName: string;
    mimeType: string;
  };

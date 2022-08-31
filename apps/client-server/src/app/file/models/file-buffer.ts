import { BaseEntityType } from '../../database/models/base-entity';
import { ISubmissionFile } from './file';
import { FileDimensions } from './file-dimensions';

export type IFileBuffer = FileDimensions &
  BaseEntityType & {
    id: string;
    buffer: Buffer;
    parent: ISubmissionFile;
    fileName: string;
    mimeType: string;
  };

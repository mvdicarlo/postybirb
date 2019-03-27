import { ITable, DATA_TYPE } from 'jsstore';
import { SubmissionFileType } from './submission-file.table';

export interface IGeneratedThumbnail {
  id: number;
  submissionId: number; // fk to submission
  submissionFileId: number; // fk to original file
  buffer: Blob;
  fileType: SubmissionFileType;
}

const GeneratedThumbnailTableName: string = 'GeneratedThumbnail';

const GeneratedThumbnailTable: ITable = {
  name: GeneratedThumbnailTableName,
  columns: [{
    name: 'id',
    primaryKey: true,
    autoIncrement: true
  }, {
    name: 'submissionId',
    notNull: true,
    dataType: DATA_TYPE.Number
  }, {
    name: 'submissionFileId',
    notNull: true,
    dataType: DATA_TYPE.Number
  }, {
    name: 'fileType',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'buffer',
    notNull: true,
    dataType: DATA_TYPE.Object
  }]
}

export { GeneratedThumbnailTable, GeneratedThumbnailTableName }

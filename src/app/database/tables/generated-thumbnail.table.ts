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
  columns: {
    id: {
      primaryKey: true,
      autoIncrement: true
    },
    submissionId: {
      notNull: true,
      dataType: DATA_TYPE.Number
    },
    submissionFileId: {
      notNull: true,
      dataType: DATA_TYPE.Number
    },
    fileType: {
      notNull: true,
      dataType: DATA_TYPE.String
    },
    buffer: {
      notNull: true,
      dataType: DATA_TYPE.Object
    }
  }
};

export { GeneratedThumbnailTable, GeneratedThumbnailTableName }

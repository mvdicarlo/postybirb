import { ITable, DATA_TYPE } from 'jsstore';
import { FileObject } from './submission-file.table';

// TODO need to complete this when I have a better idea of the data structure provided by the form

export interface ISubmission {
  id: number;
  title: string;
  rating: SubmissionRating;
  schedule?: number;
  submissionType?: SubmissionType;
  fileInfo: FileObject
}

export enum SubmissionRating {
  GENERAL = 'General',
  MATURE = 'Mature',
  ADULT = 'Adult',
  EXTREME = 'Extreme'
}

// export enum SubmissionType {
//   IMAGE = 'IMAGE',
//   TEXT = 'TEXT',
//   ANIMATION = 'ANIMATION',
//   AUDIO = 'AUDIO'
// }

export enum SubmissionType {
  SUBMISSION = 'SUBMISSION',
  JOURNAL = 'JOURNAL'
}

const SubmissionTableName: string = 'Submission';

const SubmissionTable: ITable = {
  name: SubmissionTableName,
  columns: [{
    name: 'id',
    notNull: true,
    primaryKey: true,
    autoIncrement: true
  }, {
    name: 'title',
    dataType: DATA_TYPE.String,
    default: 'New Submission'
  }, {
    name: 'rating',
    dataType: DATA_TYPE.String
  }, {
    name: 'submissionType',
    dataType: DATA_TYPE.String
  }, {
    name: 'schedule',
    dataType: DATA_TYPE.Number
  }, {
    name: 'fileInfo',
    dataType: DATA_TYPE.Object,
    notNull: true
  }]
}

export { SubmissionTable, SubmissionTableName }

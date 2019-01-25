import { ITable, DATA_TYPE } from 'jsstore';

// TODO need to complete this when I have a better idea of the data structure provided by the form

export interface ISubmission {
  id: string;
  title: string;
  rating: SubmissionRating;
  schedule?: number;
  submissionType?: SubmissionType;
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

const SubmissionTable: ITable = {
  name: 'Submission',
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
  }]
}

export { SubmissionTable }

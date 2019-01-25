import { ITable } from 'jsstore';

export interface ISubmission {
  id: string;
  name: string;
  rating: SubmissionRating;
  schedule?: number;
  submissionType: SubmissionType;
}

export enum SubmissionRating {
  GENERAL = 'General',
  MATURE = 'Mature',
  ADULT = 'Adult',
  EXTREME = 'Extreme'
}

export enum SubmissionType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  ANIMATION = 'ANIMATION',
  AUDIO = 'AUDIO'
}

const SubmissionTable: ITable = {
  name: 'Submission',
  columns: [{

  }]
}

export { SubmissionTable }

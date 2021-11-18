import SubmissionType from '../enums/submission-type.enum';

export default interface BaseSubmission {
  id: string;
  type: SubmissionType;
  order: number;
  created: Date;
  updated: Date;
}

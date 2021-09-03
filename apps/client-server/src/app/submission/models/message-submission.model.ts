import SubmissionType from '../enums/submission-type.enum';
import BaseSubmission from './base-submission.model';

export default interface MessageSubmission extends BaseSubmission {
  type: SubmissionType.MESSAGE;
}

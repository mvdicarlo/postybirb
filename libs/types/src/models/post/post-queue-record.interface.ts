import { IEntity } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';

export interface IPostQueueRecord extends IEntity {
  /**
   * Submission FK.
   * @type {SubmissionId}
   */
  submissionId: SubmissionId;

  submission: ISubmission;
}

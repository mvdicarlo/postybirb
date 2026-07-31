import { PostRecordResumeMode } from '../../enums';
import { IEntity } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';

export interface IPostQueueRecord extends IEntity {
  /**
   * Submission FK.
   * @type {SubmissionId}
   */
  submissionId: SubmissionId;

  /**
   * How the post this record starts should treat the previous attempt.
   * Undefined when the user was not asked, leaving the engine default.
   */
  resumeMode?: PostRecordResumeMode;

  submission: ISubmission;
}

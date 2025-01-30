import { EntityId, IEntity } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';
import { IPostRecord } from './post-record.interface';

export interface IPostQueueRecord extends IEntity {
  /**
   * Post record FK.
   * @type {EntityId}
   */
  postRecordId: EntityId;

  /**
   * Submission FK.
   * @type {SubmissionId}
   */
  submissionId: SubmissionId;

  postRecord?: IPostRecord;

  submission: ISubmission;
}

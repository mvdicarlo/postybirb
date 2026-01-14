import { PostRecordResumeMode, PostRecordState } from '../../enums';
import { EntityId, IEntity } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';
import { IPostEvent } from './post-event.interface';
import { IPostQueueRecord } from './post-queue-record.interface';
import { IWebsitePostRecord } from './website-post-record.interface';

/**
 * Represents a record in queue to post (or already posted).
 * @interface IPostRecord
 * @extends {IEntity}
 */
export interface IPostRecord extends IEntity {
  submissionId: SubmissionId;

  /**
   * Parent submission Id.
   * @type {SubmissionId}
   */
  submission: ISubmission;

  /**
   * The date the post was completed.
   * @type {Date}
   */
  completedAt?: string;

  /**
   * The state of the post record.
   * @type {PostRecordState}
   */
  state: PostRecordState;

  /**
   * The resume mode of the post record.
   * Relevant when a post record is requeued or resumed from an app termination.
   * @type {PostRecordResumeMode}
   */
  resumeMode: PostRecordResumeMode;

  /**
   * The children of the post record.
   * @type {IWebsitePostRecord[]}
   */
  children: IWebsitePostRecord[];

  /**
   * The event ledger for this post record.
   * Each event represents an immutable posting action or state change.
   * @type {IPostEvent[]}
   */
  events?: IPostEvent[];

  postQueueRecordId: EntityId;

  /**
   * The post queue record associated with the post record.
   * @type {IPostQueueRecord}
   */
  postQueueRecord?: IPostQueueRecord;
}

import { PostRecordResumeMode, PostRecordState } from '../../enums';
import { EntityId, IEntity } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';
import { IPostEvent } from './post-event.interface';
import { IPostQueueRecord } from './post-queue-record.interface';

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
   * Reference to the originating NEW PostRecord for this chain.
   * - null/undefined for NEW records (they ARE the origin)
   * - Set to the origin's ID for CONTINUE/RETRY records
   * @type {EntityId}
   */
  originPostRecordId?: EntityId;

  /**
   * The originating NEW PostRecord for this chain (resolved relation).
   * @type {IPostRecord}
   */
  origin?: IPostRecord;

  /**
   * All CONTINUE/RETRY PostRecords that chain to this origin (resolved relation).
   * Only populated when this record is the origin (resumeMode = NEW).
   * @type {IPostRecord[]}
   */
  chainedRecords?: IPostRecord[];

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

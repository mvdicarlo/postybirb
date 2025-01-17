// TODO: I would like to remove the need to insert Rel and Collection because it makes things more complicated than they need to be.
// Largely would just need to fix up anywhere the Rel and Collection are used to be the actual type instead of the Rel and Collection.
import { Collection, Rel } from '@mikro-orm/core';
import { PostRecordResumeMode, PostRecordState } from '../../enums';
import { IEntity } from '../database/entity.interface';
import { ISubmission } from '../submission/submission.interface';
import { IPostQueueRecord } from './post-queue-record.interface';
import { IWebsitePostRecord } from './website-post-record.interface';

/**
 * Represents a record in queue to post (or already posted).
 * @interface IPostRecord
 * @extends {IEntity}
 */
export interface IPostRecord extends IEntity {
  /**
   * Parent submission Id.
   * @type {SubmissionId}
   */
  parent: Rel<ISubmission>;

  /**
   * The date the post was completed.
   * @type {Date}
   */
  completedAt?: Date;

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
  children: Collection<IWebsitePostRecord>;

  /**
   * The post queue record associated with the post record.
   * @type {IPostQueueRecord}
   */
  postQueueRecord?: IPostQueueRecord;
}

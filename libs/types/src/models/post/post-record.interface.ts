import { Collection, Rel } from '@mikro-orm/core';
import { IEntity } from '../database/entity.interface';
import { ISubmission } from '../submission/submission.interface';
import { IWebsitePostRecord } from './website-post-record.interface';
import { PostRecordState } from '../../enums';

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
   * The children of the post record.
   * @type {IWebsitePostRecord[]}
   */
  children: Collection<IWebsitePostRecord>;
}

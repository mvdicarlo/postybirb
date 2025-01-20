import { IAccount } from '../account/account.interface';
import { EntityId, IEntity } from '../database/entity.interface';
import { PostData } from '../website/post-data.type';
import { IPostRecord } from './post-record.interface';

/**
 * Represents a record in queue to post (or already posted) to a specific website.
 * @interface IWebsitePostRecord
 * @extends {IEntity}
 */
export interface IWebsitePostRecord extends IEntity {
  /**
   * The parent post record.
   * @type {IPostRecord}
   */
  parent: IPostRecord;

  /**
   * The metadata associated with the post record.
   * @type {IPostRecordMetadata}
   */
  metadata: IPostRecordMetadata;

  /**
   * The date the post was completed.
   * @type {Date}
   */
  completedAt?: Date;

  /**
   * The account the post is made with.
   * @type {IAccount}
   */
  account: IAccount;

  /**
   * The error(s) associated with the post record.
   * @type {IWebsiteError[]}
   */
  errors?: IWebsiteError[];

  /**
   * The post data that was attempted to be posted with.
   * @type {PostData}
   */
  postData?: PostData;
}

/**
 * Represents the metadata associated with a post record.
 * @interface IPostRecordMetadata
 */
export interface IPostRecordMetadata {
  /**
   * The source Url of the post (for message submissions).
   * @type {string}
   */
  source?: string;

  /**
   * The source Urls of each file in the post mapped to File Id.
   * @type {Record<EntityId, string>}
   */
  sourceMap: Record<EntityId, string>;

  /**
   * The File Ids that have successfully posted.
   * @type {EntityId[]}
   */
  postedFiles: EntityId[];

  /**
   * TODO - Ensure this value is saved to the database as post runs.
   * The next batch number.
   * More of an internal tracker for resuming posts.
   * @type {number}
   */
  nextBatchNumber: number;
}

/**
 * Represents an error associated with a post record.
 * @interface IWebsiteError
 */
export interface IWebsiteError {
  /**
   * The File Ids that the error is associated with.
   * @type {EntityId}
   */
  files?: EntityId[];

  /**
   * The error message.
   * @type {string}
   */
  message: string;

  /**
   * The error stack.
   * @type {string}
   */
  stack: string;

  /**
   * The error stage.
   * @type {string}
   */
  stage: string;

  /**
   * Any additional error logging info that may be useful.
   * @type {*}
   */
  additionalInfo?: unknown;

  /**
   * The timestamp of the error.
   * @type {string}
   */
  timestamp: string;
}

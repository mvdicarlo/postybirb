import { IAccount } from '../account/account.interface';
import { IEntity } from '../database/entity.interface';
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
  completedAt: Date;

  /**
   * The account the post is made with.
   * @type {IAccount}
   */
  account: IAccount;

  /**
   * The error associated with the post record.
   * @type {IWebsiteError}
   */
  error?: IWebsiteError;
}

/**
 * Represents the metadata associated with a post record.
 * @interface IPostRecordMetadata
 */
export interface IPostRecordMetadata {
  /**
   * The url of the post.
   * @type {string}
   */
  url?: string;
}

/**
 * Represents an error associated with a post record.
 * @interface IWebsiteError
 */
export interface IWebsiteError {
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
   * @memberof IWebsiteError
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalInfo?: any;
}

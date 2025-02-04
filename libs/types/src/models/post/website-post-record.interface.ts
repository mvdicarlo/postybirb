import { AccountId, IAccount } from '../account/account.interface';
import { EntityId, IEntity } from '../database/entity.interface';
import { IWebsiteOptions } from '../website-options/website-options.interface';
import { PostFields } from '../website/post-data.type';
import { IPostRecord } from './post-record.interface';

/**
 * Represents a record in queue to post (or already posted) to a specific website.
 * @interface IWebsitePostRecord
 * @extends {IEntity}
 */
export interface IWebsitePostRecord extends IEntity {
  postRecordId: EntityId;

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
   * @type {string}
   */
  completedAt: string;

  accountId: AccountId;

  /**
   * The account the post is made with.
   * @type {IAccount}
   */
  account: IAccount;

  /**
   * The error(s) associated with the post record.
   * @type {IWebsiteError[]}
   */
  errors: IWebsiteError[];

  /**
   * The post data that was attempted to be posted with.
   * @type {WebsitePostRecordData}
   */
  postData: WebsitePostRecordData;
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

export type WebsitePostRecordData = {
  /**
   * The merged parsed website options form data.
   * @type {PostFields}
   */
  parsedOptions?: PostFields;

  /**
   * The website options used.
   * @type {IWebsiteOptions}
   */
  websiteOptions: IWebsiteOptions[];
};

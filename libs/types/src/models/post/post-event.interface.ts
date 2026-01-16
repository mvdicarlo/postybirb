import { PostEventType } from '../../enums';
import { AccountId } from '../account/account.interface';
import { EntityId, IEntity } from '../database/entity.interface';
import { IWebsiteOptions } from '../website-options/website-options.interface';
import { PostFields } from '../website/post-data.type';

/**
 * The post data captured at posting time.
 * @interface WebsitePostRecordData
 */
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

/**
 * Error information stored on failed post events.
 * @interface IPostEventError
 */
export interface IPostEventError {
  /**
   * The error message.
   * @type {string}
   */
  message: string;

  /**
   * The error stack trace.
   * @type {string}
   */
  stack?: string;

  /**
   * The stage at which the error occurred (e.g., 'validation', 'upload', 'post').
   * @type {string}
   */
  stage?: string;

  /**
   * Any additional error context that may be useful for debugging.
   * @type {unknown}
   */
  additionalInfo?: unknown;
}

/**
 * Snapshot of account information at the time of the event.
 * Survives account deletion for historical display.
 * @interface IAccountSnapshot
 */
export interface IAccountSnapshot {
  /**
   * The account display name.
   * @type {string}
   */
  name: string;

  /**
   * The website identifier (e.g., 'deviantart', 'furaffinity').
   * @type {string}
   */
  website: string;
}

/**
 * Snapshot of file information at the time of posting.
 * Survives file deletion for historical display.
 * @interface IFileSnapshot
 */
export interface IFileSnapshot {
  /**
   * The original file name.
   * @type {string}
   */
  fileName: string;

  /**
   * The MIME type of the file.
   * @type {string}
   */
  mimeType: string;

  /**
   * The file size in bytes.
   * @type {number}
   */
  size: number;

  /**
   * Optional hash for deduplication verification.
   * @type {string}
   */
  hash?: string;
}

/**
 * Flexible metadata stored on post events.
 * Contains snapshots and debug information.
 * @interface IPostEventMetadata
 */
export interface IPostEventMetadata {
  /**
   * The batch number this file was posted in (debug/audit only).
   * @type {number}
   */
  batchNumber?: number;

  /**
   * The website instance ID.
   * @type {string}
   */
  instanceId?: string;

  /**
   * Any response message from the website.
   * @type {string}
   */
  responseMessage?: string;

  /**
   * Account snapshot at time of event (survives account deletion).
   * Present on POST_ATTEMPT_STARTED events.
   * @type {IAccountSnapshot}
   */
  accountSnapshot?: IAccountSnapshot;

  /**
   * File snapshot at time of event (survives file deletion).
   * Present on FILE_POSTED and FILE_FAILED events.
   * @type {IFileSnapshot}
   */
  fileSnapshot?: IFileSnapshot;

  /**
   * The post data used for this attempt.
   * Present on POST_ATTEMPT_STARTED events.
   * @type {WebsitePostRecordData}
   */
  postData?: WebsitePostRecordData;

  /**
   * Any additional information for debugging.
   * @type {unknown}
   */
  additionalInfo?: unknown;
}

/**
 * Represents an immutable event in the post event ledger.
 * Each posting action creates one or more events that are never mutated.
 * @interface IPostEvent
 * @extends {IEntity}
 */
export interface IPostEvent extends IEntity {
  /**
   * The post record this event belongs to.
   * @type {EntityId}
   */
  postRecordId: EntityId;

  /**
   * The account this event relates to.
   * May be null if account was deleted.
   * @type {AccountId}
   */
  accountId?: AccountId;

  /**
   * The type of event.
   * @type {PostEventType}
   */
  eventType: PostEventType;

  /**
   * The file this event relates to (null for message submissions and lifecycle events).
   * @type {EntityId}
   */
  fileId?: EntityId;

  /**
   * The source URL returned by the website on successful post.
   * @type {string}
   */
  sourceUrl?: string;

  /**
   * Error information for failed events.
   * @type {IPostEventError}
   */
  error?: IPostEventError;

  /**
   * Flexible metadata including snapshots.
   * @type {IPostEventMetadata}
   */
  metadata?: IPostEventMetadata;
}

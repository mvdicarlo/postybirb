import { Injectable } from '@nestjs/common';
import { Insert } from '@postybirb/database';
import {
    AccountId,
    EntityId,
    PostEventType,
} from '@postybirb/types';
import { PostEvent } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';

/**
 * Query result for posted files.
 * @interface PostedFileResult
 */
export interface PostedFileResult {
  fileId: EntityId;
  sourceUrl?: string;
}

/**
 * Query result for completed accounts.
 * @interface CompletedAccountResult
 */
export interface CompletedAccountResult {
  accountId: AccountId;
  eventType: PostEventType;
}

/**
 * Repository for querying PostEvent records.
 * Provides specialized query methods for resume mode logic.
 * @class PostEventRepository
 */
@Injectable()
export class PostEventRepository {
  private readonly repository: PostyBirbDatabase<'PostEventSchema'>;

  constructor() {
    this.repository = new PostyBirbDatabase('PostEventSchema', {
      account: true,
    });
  }

  /**
   * Get all events for a post record.
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<PostEvent[]>} All events for the post record
   */
  async findByPostRecordId(postRecordId: EntityId): Promise<PostEvent[]> {
    return this.repository.find({
      where: (event, { eq }) => eq(event.postRecordId, postRecordId),
    });
  }

  /**
   * Get all successfully posted files for a post record.
   * Used for CONTINUE resume mode to skip already-posted files.
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<PostedFileResult[]>} List of posted files with their source URLs
   */
  async getPostedFiles(postRecordId: EntityId): Promise<PostedFileResult[]> {
    const events = await this.repository.find({
      where: (event, { eq, and }) =>
        and(
          eq(event.postRecordId, postRecordId),
          eq(event.eventType, PostEventType.FILE_POSTED),
        ),
    });

    return events
      .filter((event): event is PostEvent & { fileId: EntityId } => event.fileId != null)
      .map((event) => ({
        fileId: event.fileId,
        sourceUrl: event.sourceUrl,
      }));
  }

  /**
   * Get all successfully posted files for a specific account within a post record.
   * @param {EntityId} postRecordId - The post record ID
   * @param {AccountId} accountId - The account ID
   * @returns {Promise<PostedFileResult[]>} List of posted files with their source URLs
   */
  async getPostedFilesForAccount(
    postRecordId: EntityId,
    accountId: AccountId,
  ): Promise<PostedFileResult[]> {
    const events = await this.repository.find({
      where: (event, { eq, and }) =>
        and(
          eq(event.postRecordId, postRecordId),
          eq(event.accountId, accountId),
          eq(event.eventType, PostEventType.FILE_POSTED),
        ),
    });

    return events
      .filter((event): event is PostEvent & { fileId: EntityId } => event.fileId != null)
      .map((event) => ({
        fileId: event.fileId,
        sourceUrl: event.sourceUrl,
      }));
  }

  /**
   * Get all completed or failed accounts for a post record.
   * Used for CONTINUE_RETRY resume mode to skip completed accounts.
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<CompletedAccountResult[]>} List of completed/failed accounts
   */
  async getCompletedAccounts(
    postRecordId: EntityId,
  ): Promise<CompletedAccountResult[]> {
    const events = await this.repository.find({
      where: (event, { eq, and, inArray }) =>
        and(
          eq(event.postRecordId, postRecordId),
          inArray(event.eventType, [
            PostEventType.POST_ATTEMPT_COMPLETED,
            PostEventType.POST_ATTEMPT_FAILED,
          ]),
        ),
    });

    return events
      .filter((event): event is PostEvent & { accountId: AccountId } => event.accountId != null)
      .map((event) => ({
        accountId: event.accountId,
        eventType: event.eventType,
      }));
  }

  /**
   * Get only successfully completed accounts for a post record.
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<AccountId[]>} List of successfully completed account IDs
   */
  async getSuccessfullyCompletedAccountIds(
    postRecordId: EntityId,
  ): Promise<AccountId[]> {
    const events = await this.repository.find({
      where: (event, { eq, and }) =>
        and(
          eq(event.postRecordId, postRecordId),
          eq(event.eventType, PostEventType.POST_ATTEMPT_COMPLETED),
        ),
    });

    return events
      .filter((event): event is PostEvent & { accountId: AccountId } => event.accountId != null)
      .map((event) => event.accountId);
  }

  /**
   * Check if an account has a terminal event (completed or failed).
   * @param {EntityId} postRecordId - The post record ID
   * @param {AccountId} accountId - The account ID
   * @returns {Promise<boolean>} True if the account has a terminal event
   */
  async hasTerminalEvent(
    postRecordId: EntityId,
    accountId: AccountId,
  ): Promise<boolean> {
    const events = await this.repository.find({
      where: (event, { eq, and, inArray }) =>
        and(
          eq(event.postRecordId, postRecordId),
          eq(event.accountId, accountId),
          inArray(event.eventType, [
            PostEventType.POST_ATTEMPT_COMPLETED,
            PostEventType.POST_ATTEMPT_FAILED,
          ]),
        ),
    });

    return events.length > 0;
  }

  /**
   * Get all source URLs from successfully posted files/messages for a post record.
   * Used for cross-website source URL propagation.
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<Map<AccountId, string[]>>} Map of account ID to source URLs
   */
  async getSourceUrlsByAccount(
    postRecordId: EntityId,
  ): Promise<Map<AccountId, string[]>> {
    const events = await this.repository.find({
      where: (event, { eq, and, inArray, isNotNull }) =>
        and(
          eq(event.postRecordId, postRecordId),
          inArray(event.eventType, [
            PostEventType.FILE_POSTED,
            PostEventType.MESSAGE_POSTED,
          ]),
        ),
    });

    const result = new Map<AccountId, string[]>();

    for (const event of events) {
      if (event.accountId && event.sourceUrl) {
        const existing = result.get(event.accountId) || [];
        existing.push(event.sourceUrl);
        result.set(event.accountId, existing);
      }
    }

    return result;
  }

  /**
   * Get all source URLs from a post record, excluding a specific account.
   * Used for cross-website source URL propagation within the current post.
   * @param {EntityId} postRecordId - The post record ID
   * @param {AccountId} excludeAccountId - The account ID to exclude (to avoid self-referential URLs)
   * @returns {Promise<string[]>} Array of source URLs from other accounts
   */
  async getSourceUrlsFromPost(
    postRecordId: EntityId,
    excludeAccountId: AccountId,
  ): Promise<string[]> {
    const events = await this.repository.find({
      where: (event, { eq, and, inArray }) =>
        and(
          eq(event.postRecordId, postRecordId),
          inArray(event.eventType, [
            PostEventType.FILE_POSTED,
            PostEventType.MESSAGE_POSTED,
          ]),
        ),
    });

    return events
      .filter(
        (event) =>
          event.sourceUrl &&
          event.accountId &&
          event.accountId !== excludeAccountId,
      )
      .map((event) => event.sourceUrl as string);
  }

  /**
   * Get all error events for a post record.
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<PostEvent[]>} All failed events
   */
  async getFailedEvents(postRecordId: EntityId): Promise<PostEvent[]> {
    return this.repository.find({
      where: (event, { eq, and, inArray }) =>
        and(
          eq(event.postRecordId, postRecordId),
          inArray(event.eventType, [
            PostEventType.POST_ATTEMPT_FAILED,
            PostEventType.FILE_FAILED,
            PostEventType.MESSAGE_FAILED,
          ]),
        ),
    });
  }

  /**
   * Insert a new post event.
   * @param {Insert<'PostEventSchema'>} event - The event to insert
   * @returns {Promise<PostEvent>} The inserted event
   */
  async insert(event: Insert<'PostEventSchema'>): Promise<PostEvent> {
    return this.repository.insert(event) as Promise<PostEvent>;
  }

  /**
   * Get the underlying repository for advanced queries.
   * @returns {PostyBirbDatabase<'PostEventSchema'>} The repository
   */
  getRepository(): PostyBirbDatabase<'PostEventSchema'> {
    return this.repository;
  }
}

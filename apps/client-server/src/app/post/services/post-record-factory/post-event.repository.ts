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
}

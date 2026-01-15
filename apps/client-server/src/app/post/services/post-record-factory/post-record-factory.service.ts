import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  AccountId,
  EntityId,
  PostEventType,
  PostRecordResumeMode,
  PostRecordState,
} from '@postybirb/types';
import { PostEvent, PostRecord } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { PostEventRepository } from './post-event.repository';

/**
 * Resume context containing information from a prior post attempt.
 * Used to determine what to skip or retry when resuming.
 * @interface ResumeContext
 */
export interface ResumeContext {
  /**
   * The prior post record ID this context was derived from.
   * @type {EntityId}
   */
  priorPostRecordId: EntityId;

  /**
   * The resume mode used to create this context.
   * @type {PostRecordResumeMode}
   */
  resumeMode: PostRecordResumeMode;

  /**
   * Account IDs that have already completed successfully.
   * For CONTINUE_RETRY mode, these accounts should be skipped entirely.
   * @type {Set<AccountId>}
   */
  completedAccountIds: Set<AccountId>;

  /**
   * Map of account ID to file IDs that have been successfully posted.
   * For CONTINUE mode, these files should be skipped for each account.
   * @type {Map<AccountId, Set<EntityId>>}
   */
  postedFilesByAccount: Map<AccountId, Set<EntityId>>;

  /**
   * Map of account ID to source URLs from prior successful posts.
   * Used for cross-website source URL propagation.
   * @type {Map<AccountId, string[]>}
   */
  sourceUrlsByAccount: Map<AccountId, string[]>;
}

/**
 * Factory service for creating PostRecord entities.
 * Handles resume mode logic by querying the event ledger.
 * @class PostRecordFactory
 */
@Injectable()
export class PostRecordFactory {
  private readonly logger = Logger(this.constructor.name);

  private readonly postRecordRepository: PostyBirbDatabase<'PostRecordSchema'>;

  constructor(private readonly postEventRepository: PostEventRepository) {
    this.postRecordRepository = new PostyBirbDatabase('PostRecordSchema');
  }

  /**
   * Create a new PostRecord for a submission that is being posted for the first time.
   * @param {EntityId} submissionId - The submission ID
   * @returns {Promise<PostRecord>} The created post record
   */
  async createFresh(submissionId: EntityId): Promise<PostRecord> {
    this.logger
      .withMetadata({ submissionId })
      .info('Creating fresh post record');

    return this.postRecordRepository.insert({
      submissionId,
      state: PostRecordState.PENDING,
      resumeMode: PostRecordResumeMode.RESTART,
    });
  }

  /**
   * Create a new PostRecord based on a prior attempt, using the specified resume mode.
   * The prior post record remains immutable; this creates a new record with context
   * from the event ledger.
   *
   * @param {EntityId} priorPostRecordId - The prior post record to resume from
   * @param {PostRecordResumeMode} resumeMode - How to resume (CONTINUE, CONTINUE_RETRY, RESTART)
   * @returns {Promise<PostRecord>} The new post record
   */
  async createFromPrior(
    priorPostRecordId: EntityId,
    resumeMode: PostRecordResumeMode,
  ): Promise<PostRecord> {
    this.logger
      .withMetadata({ priorPostRecordId, resumeMode })
      .info('Creating post record from prior attempt');

    // Get the prior post record to copy submission reference
    const priorRecord =
      await this.postRecordRepository.findById(priorPostRecordId);

    if (!priorRecord) {
      throw new Error(`Prior post record not found: ${priorPostRecordId}`);
    }

    // Create the new post record with the specified resume mode
    return this.postRecordRepository.insert({
      submissionId: priorRecord.submissionId,
      state: PostRecordState.PENDING,
      resumeMode,
    });
  }

  // ========================================================================
  // Resume Context Building
  // ========================================================================

  /**
   * Build resume context from prior post records for the same submission.
   *
   * This method handles the chain of posting attempts correctly:
   * - DONE records represent complete "posting sessions" - they act as stop points
   * - FAILED records represent incomplete attempts that should be aggregated
   * - RUNNING records (crash recovery) should aggregate their own events
   *
   * Logic:
   * 1. Always include events from the specific record being resumed (handles crash recovery)
   * 2. If the most recent is DONE → return empty context (nothing to continue, start fresh)
   * 3. If the most recent is FAILED → aggregate from FAILED records until we hit a DONE
   *
   * @param {EntityId} submissionId - The submission ID
   * @param {EntityId} priorPostRecordId - The immediate prior post record ID
   * @param {PostRecordResumeMode} resumeMode - The resume mode
   * @returns {Promise<ResumeContext>} The resume context
   */
  async buildResumeContext(
    submissionId: EntityId,
    priorPostRecordId: EntityId,
    resumeMode: PostRecordResumeMode,
  ): Promise<ResumeContext> {
    const context = this.createEmptyContext(priorPostRecordId, resumeMode);

    // First, always fetch the specific record we're resuming from.
    // This handles crash recovery where the record is RUNNING (not terminal).
    const currentRecord = await this.postRecordRepository.findById(
      priorPostRecordId,
      undefined,
      { events: true },
    );

    // For RESTART mode on a fresh record, return empty context
    // But for crash recovery (RUNNING state), we still need to aggregate our own events
    if (resumeMode === PostRecordResumeMode.RESTART) {
      if (currentRecord?.state === PostRecordState.RUNNING) {
        // Crash recovery: aggregate events from this record regardless of resumeMode
        this.logger.debug('RESTART mode but RUNNING state (crash recovery) - aggregating own events');
        this.aggregateFromRecords([currentRecord], context, true);
      } else {
        this.logger.debug('RESTART mode - returning empty resume context');
      }
      return context;
    }

    // Get terminal records to aggregate based on the chain logic
    const terminalRecords = await this.getRecordsToAggregate(submissionId);

    // Combine: current record (if RUNNING) + terminal records (excluding duplicates)
    const recordsToAggregate = this.combineRecordsForAggregation(
      currentRecord,
      terminalRecords,
    );

    if (recordsToAggregate.length === 0) {
      this.logger.debug(
        'No records to aggregate (fresh start or most recent was DONE)',
      );
      return context;
    }

    // Aggregate events based on resume mode
    const includePostedFiles = resumeMode === PostRecordResumeMode.CONTINUE;
    this.aggregateFromRecords(recordsToAggregate, context, includePostedFiles);

    this.logger
      .withMetadata({
        completedAccountCount: context.completedAccountIds.size,
        accountsWithPostedFiles: context.postedFilesByAccount.size,
        aggregatedRecordCount: recordsToAggregate.length,
        resumeMode,
      })
      .debug('Built resume context');

    return context;
  }

  /**
   * Combine the current record (if RUNNING) with terminal records, avoiding duplicates.
   * This ensures crash recovery includes the RUNNING record's events.
   */
  private combineRecordsForAggregation(
    currentRecord: PostRecord | null | undefined,
    terminalRecords: PostRecord[],
  ): PostRecord[] {
    const result: PostRecord[] = [];
    const seenIds = new Set<EntityId>();

    // Add current record first if it's RUNNING (crash recovery case)
    if (currentRecord?.state === PostRecordState.RUNNING) {
      result.push(currentRecord);
      seenIds.add(currentRecord.id);
    }

    // Add terminal records that weren't already added
    for (const record of terminalRecords) {
      if (!seenIds.has(record.id)) {
        result.push(record);
        seenIds.add(record.id);
      }
    }

    return result;
  }

  /**
   * Aggregate events from a list of records into the context.
   */
  private aggregateFromRecords(
    records: PostRecord[],
    context: ResumeContext,
    includePostedFiles: boolean,
  ): void {
    this.aggregateSourceUrls(records, context);
    this.aggregateCompletedAccounts(records, context);

    if (includePostedFiles) {
      this.aggregatePostedFiles(records, context);
    }
  }

  /**
   * Create an empty resume context with default values.
   */
  private createEmptyContext(
    priorPostRecordId: EntityId,
    resumeMode: PostRecordResumeMode,
  ): ResumeContext {
    return {
      priorPostRecordId,
      resumeMode,
      completedAccountIds: new Set<AccountId>(),
      postedFilesByAccount: new Map<AccountId, Set<EntityId>>(),
      sourceUrlsByAccount: new Map<AccountId, string[]>(),
    };
  }

  /**
   * Get the list of PostRecords whose events should be aggregated.
   *
   * Note: This method assumes we're in a resume scenario (not a fresh start).
   * The PostQueueService checks if the most recent record is DONE and calls
   * createFresh() instead of createFromPrior() in that case.
   *
   * Rules:
   * - Aggregate all consecutive FAILED records (newest to oldest)
   * - Stop when hitting a DONE record (completed session is a stop point)
   * - Stop when hitting a record with resumeMode=RESTART (user-initiated fresh start)
   *
   * @param {EntityId} submissionId - The submission ID
   * @returns {Promise<PostRecord[]>} Records to aggregate (may be empty)
   */
  private async getRecordsToAggregate(
    submissionId: EntityId,
  ): Promise<PostRecord[]> {
    // Get ALL terminal records for this submission, ordered by creation date (newest first)
    const allTerminalRecords = await this.postRecordRepository.find({
      where: (record, { eq, and, inArray }) =>
        and(
          eq(record.submissionId, submissionId),
          inArray(record.state, [PostRecordState.DONE, PostRecordState.FAILED]),
        ),
      orderBy: (record, { desc }) => desc(record.createdAt),
      with: {
        events: true,
      },
    });

    if (allTerminalRecords.length === 0) {
      this.logger.debug('No prior terminal records found');
      return [];
    }

    // Aggregate FAILED records until we hit a stop point
    const recordsToAggregate: PostRecord[] = [];
    for (const record of allTerminalRecords) {
      const { isStopPoint, reason } = this.isAggregationStopPoint(record);

      if (isStopPoint) {
        this.logger
          .withMetadata({ stopAtRecordId: record.id, reason })
          .debug('Hit stop point - stopping aggregation chain');

        // RESTART is a stop point BUT we include its events first
        if (record.resumeMode === PostRecordResumeMode.RESTART) {
          recordsToAggregate.push(record);
        }
        // DONE is a complete stop - don't include it
        break;
      }

      recordsToAggregate.push(record);
    }

    this.logger
      .withMetadata({
        submissionId,
        totalTerminalRecords: allTerminalRecords.length,
        aggregatedRecordCount: recordsToAggregate.length,
        aggregatedRecordIds: recordsToAggregate.map((r) => r.id),
      })
      .debug('Determined records to aggregate');

    return recordsToAggregate;
  }

  /**
   * Check if a PostRecord is a stop point in the aggregation chain.
   * Stop points represent boundaries where we should not read prior events.
   *
   * @param {PostRecord} record - The record to check
   * @returns {{ isStopPoint: boolean; reason?: string }} Whether it's a stop point and why
   */
  private isAggregationStopPoint(record: PostRecord): {
    isStopPoint: boolean;
    reason?: string;
  } {
    if (record.state === PostRecordState.DONE) {
      return { isStopPoint: true, reason: 'DONE state (completed session)' };
    }

    if (record.resumeMode === PostRecordResumeMode.RESTART) {
      return {
        isStopPoint: true,
        reason: 'RESTART resumeMode (user-initiated fresh start)',
      };
    }

    return { isStopPoint: false };
  }

  /**
   * Aggregate source URLs from events into the context.
   * Source URLs are used for cross-website propagation.
   */
  private aggregateSourceUrls(
    records: PostRecord[],
    context: ResumeContext,
  ): void {
    for (const record of records) {
      if (!record.events) continue;

      for (const event of record.events) {
        if (
          this.isSourceUrlEvent(event) &&
          event.accountId &&
          event.sourceUrl
        ) {
          this.addSourceUrl(context, event.accountId, event.sourceUrl);
        }
      }
    }
  }

  /**
   * Aggregate completed account IDs from events into the context.
   */
  private aggregateCompletedAccounts(
    records: PostRecord[],
    context: ResumeContext,
  ): void {
    for (const record of records) {
      if (!record.events) continue;

      for (const event of record.events) {
        if (
          event.eventType === PostEventType.POST_ATTEMPT_COMPLETED &&
          event.accountId
        ) {
          context.completedAccountIds.add(event.accountId);
        }
      }
    }
  }

  /**
   * Aggregate posted file IDs (per account) from events into the context.
   */
  private aggregatePostedFiles(
    records: PostRecord[],
    context: ResumeContext,
  ): void {
    for (const record of records) {
      if (!record.events) continue;

      for (const event of record.events) {
        if (
          event.eventType === PostEventType.FILE_POSTED &&
          event.accountId &&
          event.fileId
        ) {
          this.addPostedFile(context, event.accountId, event.fileId);
        }
      }
    }
  }

  /**
   * Check if an event contains a source URL (FILE_POSTED or MESSAGE_POSTED).
   */
  private isSourceUrlEvent(event: PostEvent): boolean {
    return (
      event.eventType === PostEventType.FILE_POSTED ||
      event.eventType === PostEventType.MESSAGE_POSTED
    );
  }

  /**
   * Add a source URL to the context for an account.
   */
  private addSourceUrl(
    context: ResumeContext,
    accountId: AccountId,
    sourceUrl: string,
  ): void {
    const existing = context.sourceUrlsByAccount.get(accountId);
    if (existing) {
      existing.push(sourceUrl);
    } else {
      context.sourceUrlsByAccount.set(accountId, [sourceUrl]);
    }
  }

  /**
   * Add a posted file to the context for an account.
   */
  private addPostedFile(
    context: ResumeContext,
    accountId: AccountId,
    fileId: EntityId,
  ): void {
    const existing = context.postedFilesByAccount.get(accountId);
    if (existing) {
      existing.add(fileId);
    } else {
      context.postedFilesByAccount.set(accountId, new Set([fileId]));
    }
  }

  // ========================================================================
  // Resume Context Helpers
  // ========================================================================

  /**
   * Check if an account should be skipped based on resume context.
   * @param {ResumeContext} context - The resume context
   * @param {AccountId} accountId - The account to check
   * @returns {boolean} True if the account should be skipped
   */
  shouldSkipAccount(context: ResumeContext, accountId: AccountId): boolean {
    return context.completedAccountIds.has(accountId);
  }

  /**
   * Check if a file should be skipped for a specific account based on resume context.
   * @param {ResumeContext} context - The resume context
   * @param {AccountId} accountId - The account ID
   * @param {EntityId} fileId - The file ID to check
   * @returns {boolean} True if the file should be skipped
   */
  shouldSkipFile(
    context: ResumeContext,
    accountId: AccountId,
    fileId: EntityId,
  ): boolean {
    // If account is completed, all files should be skipped (handled by shouldSkipAccount)
    // This method is for checking individual files within a non-completed account

    if (context.resumeMode === PostRecordResumeMode.RESTART) {
      return false;
    }

    if (context.resumeMode === PostRecordResumeMode.CONTINUE_RETRY) {
      // CONTINUE_RETRY retries all files for non-completed accounts
      return false;
    }

    // CONTINUE mode: skip files that were already posted
    const postedFiles = context.postedFilesByAccount.get(accountId);
    return postedFiles?.has(fileId) ?? false;
  }

  /**
   * Get source URLs from prior attempts for cross-website propagation.
   * @param {ResumeContext} context - The resume context
   * @param {AccountId} accountId - The account to get URLs for
   * @returns {string[]} Source URLs from the prior attempt
   */
  getSourceUrlsForAccount(
    context: ResumeContext,
    accountId: AccountId,
  ): string[] {
    return context.sourceUrlsByAccount.get(accountId) ?? [];
  }

  /**
   * Get all source URLs from all accounts in the resume context.
   * @param {ResumeContext} context - The resume context
   * @returns {string[]} All source URLs
   */
  getAllSourceUrls(context: ResumeContext): string[] {
    const allUrls: string[] = [];
    for (const urls of context.sourceUrlsByAccount.values()) {
      allUrls.push(...urls);
    }
    return allUrls;
  }

  /**
   * Get all source URLs from the resume context, excluding a specific account.
   * Used for cross-website source URL propagation to avoid self-referential URLs.
   * @param {ResumeContext} context - The resume context
   * @param {AccountId} excludeAccountId - The account ID to exclude
   * @returns {string[]} Source URLs from all accounts except the excluded one
   */
  getSourceUrlsExcludingAccount(
    context: ResumeContext,
    excludeAccountId: AccountId,
  ): string[] {
    const allUrls: string[] = [];
    for (const [accountId, urls] of context.sourceUrlsByAccount.entries()) {
      if (accountId !== excludeAccountId) {
        allUrls.push(...urls);
      }
    }
    return allUrls;
  }
}

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
import { InvalidPostChainError } from '../../errors';
import { PostEventRepository } from './post-event.repository';

/**
 * Resume context containing information from a prior post attempt.
 * Used to determine what to skip or retry when resuming.
 * @interface ResumeContext
 */
export interface ResumeContext {
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
   * Create a new PostRecord for a submission.
   *
   * For NEW mode: Creates a fresh record with originPostRecordId = null (it IS the origin).
   * For CONTINUE/RETRY: Finds the most recent NEW record for this submission and chains to it.
   *
   * @param {EntityId} submissionId - The submission ID
   * @param {PostRecordResumeMode} resumeMode - The resume mode (defaults to NEW)
   * @returns {Promise<PostRecord>} The created post record
   * @throws {InvalidPostChainError} If CONTINUE/RETRY is requested but no valid origin exists,
   *         or if a PostRecord is already PENDING or RUNNING for this submission
   */
  async create(
    submissionId: EntityId,
    resumeMode: PostRecordResumeMode = PostRecordResumeMode.NEW,
  ): Promise<PostRecord> {
    this.logger
      .withMetadata({ submissionId, resumeMode })
      .info('Creating post record');

    // Guard: Prevent creating a new record if one is already in progress
    const inProgressRecord = await this.findInProgressRecord(submissionId);
    if (inProgressRecord) {
      this.logger
        .withMetadata({ existingRecordId: inProgressRecord.id, existingState: inProgressRecord.state })
        .warn('Cannot create PostRecord: submission already has an in-progress record');
      throw new InvalidPostChainError(submissionId, resumeMode, 'in_progress');
    }

    let originPostRecordId: EntityId | null = null;

    if (resumeMode !== PostRecordResumeMode.NEW) {
      // Find the most recent NEW record for this submission (no state filter)
      const originRecord = await this.findMostRecentOrigin(submissionId);

      if (!originRecord) {
        throw new InvalidPostChainError(submissionId, resumeMode, 'no_origin');
      }

      if (originRecord.state === PostRecordState.DONE) {
        throw new InvalidPostChainError(submissionId, resumeMode, 'origin_done');
      }

      originPostRecordId = originRecord.id;
      this.logger
        .withMetadata({ originPostRecordId })
        .debug('Chaining to origin PostRecord');
    }

    return this.postRecordRepository.insert({
      submissionId,
      state: PostRecordState.PENDING,
      resumeMode,
      originPostRecordId,
    });
  }

  /**
   * Find the most recent NEW PostRecord for a submission.
   * Used to determine the origin for CONTINUE/RETRY records.
   *
   * @param {EntityId} submissionId - The submission ID
   * @returns {Promise<PostRecord | null>} The most recent NEW record, or null if none exists
   */
  private async findMostRecentOrigin(
    submissionId: EntityId,
  ): Promise<PostRecord | null> {
    const records = await this.postRecordRepository.find({
      where: (record, { eq, and }) =>
        and(
          eq(record.submissionId, submissionId),
          eq(record.resumeMode, PostRecordResumeMode.NEW),
        ),
      orderBy: (record, { desc }) => desc(record.createdAt),
      limit: 1,
    });

    return records.length > 0 ? records[0] : null;
  }

  /**
   * Find any PENDING or RUNNING PostRecord for a submission.
   * Used to prevent creating a new record when one is already in progress.
   *
   * @param {EntityId} submissionId - The submission ID
   * @returns {Promise<PostRecord | null>} An in-progress record, or null if none exists
   */
  private async findInProgressRecord(
    submissionId: EntityId,
  ): Promise<PostRecord | null> {
    const records = await this.postRecordRepository.find({
      where: (record, { eq, and, or }) =>
        and(
          eq(record.submissionId, submissionId),
          or(
            eq(record.state, PostRecordState.PENDING),
            eq(record.state, PostRecordState.RUNNING),
          ),
        ),
      limit: 1,
    });

    return records.length > 0 ? records[0] : null;
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
   * 1. Always include events from the current record being started (handles crash recovery)
   * 2. If the most recent terminal is DONE → return empty context (nothing to continue, start fresh)
   * 3. If the most recent terminal is FAILED → aggregate from FAILED records until we hit a DONE
   *
   * @param {EntityId} submissionId - The submission ID
   * @param {EntityId} currentRecordId - The ID of the record being started
   * @param {PostRecordResumeMode} resumeMode - The resume mode
   * @returns {Promise<ResumeContext>} The resume context
   */
  async buildResumeContext(
    submissionId: EntityId,
    currentRecordId: EntityId,
    resumeMode: PostRecordResumeMode,
  ): Promise<ResumeContext> {
    const context = this.createEmptyContext(resumeMode);

    // First, always fetch the specific record we're starting.
    // This handles crash recovery where the record is RUNNING (not terminal).
    const currentRecord = await this.postRecordRepository.findById(
      currentRecordId,
      undefined,
      { events: true },
    );

    // For NEW mode on a fresh record, return empty context
    // But for crash recovery (RUNNING state), we still need to aggregate our own events
    if (resumeMode === PostRecordResumeMode.NEW) {
      if (currentRecord?.state === PostRecordState.RUNNING) {
        // Crash recovery: aggregate events from this record regardless of resumeMode
        this.logger.debug(
          'NEW mode but RUNNING state (crash recovery) - aggregating own events',
        );
        this.aggregateFromRecords([currentRecord], context, true);
      } else {
        this.logger.debug('NEW mode - returning empty resume context');
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
  private createEmptyContext(resumeMode: PostRecordResumeMode): ResumeContext {
    return {
      resumeMode,
      completedAccountIds: new Set<AccountId>(),
      postedFilesByAccount: new Map<AccountId, Set<EntityId>>(),
      sourceUrlsByAccount: new Map<AccountId, string[]>(),
    };
  }

  /**
   * Get the list of PostRecords whose events should be aggregated.
   *
   * Uses the originPostRecordId field to find all records in the same chain.
   * A chain consists of:
   * - The origin NEW record (originPostRecordId = null, resumeMode = NEW)
   * - All CONTINUE/RETRY records that reference that origin
   *
   * @param {EntityId} submissionId - The submission ID
   * @param {EntityId} [originId] - Optional origin ID to query directly
   * @returns {Promise<PostRecord[]>} Records to aggregate (may be empty)
   */
  private async getRecordsToAggregate(
    submissionId: EntityId,
    originId?: EntityId,
  ): Promise<PostRecord[]> {
    // If no origin provided, find the most recent origin for this submission
    let effectiveOriginId = originId;
    if (!effectiveOriginId) {
      const origin = await this.findMostRecentOrigin(submissionId);
      if (!origin) {
        this.logger.debug('No origin PostRecord found for submission');
        return [];
      }
      effectiveOriginId = origin.id;
    }

    // Query all records in this chain: the origin + all records referencing it
    const chainRecords = await this.postRecordRepository.find({
      where: (record, { eq, or }) =>
        or(
          eq(record.id, effectiveOriginId),
          eq(record.originPostRecordId, effectiveOriginId),
        ),
      orderBy: (record, { asc }) => asc(record.createdAt),
      with: {
        events: true,
      },
    });

    this.logger
      .withMetadata({
        submissionId,
        originId: effectiveOriginId,
        chainRecordCount: chainRecords.length,
        chainRecordIds: chainRecords.map((r) => r.id),
      })
      .debug('Retrieved chain records for aggregation');

    return chainRecords;
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

    if (context.resumeMode === PostRecordResumeMode.NEW) {
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

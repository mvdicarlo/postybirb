import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
    AccountId,
    EntityId,
    PostRecordResumeMode,
    PostRecordState,
} from '@postybirb/types';
import { PostRecord } from '../../../drizzle/models';
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
    const priorRecord = await this.postRecordRepository.findById(
      priorPostRecordId,
    );

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

  /**
   * Build resume context from a prior post record's event ledger.
   * This context is used during posting to determine what to skip or retry.
   *
   * @param {EntityId} priorPostRecordId - The prior post record ID
   * @param {PostRecordResumeMode} resumeMode - The resume mode
   * @returns {Promise<ResumeContext>} The resume context
   */
  async buildResumeContext(
    priorPostRecordId: EntityId,
    resumeMode: PostRecordResumeMode,
  ): Promise<ResumeContext> {
    const context: ResumeContext = {
      priorPostRecordId,
      resumeMode,
      completedAccountIds: new Set<AccountId>(),
      postedFilesByAccount: new Map<AccountId, Set<EntityId>>(),
      sourceUrlsByAccount: new Map<AccountId, string[]>(),
    };

    // For RESTART mode, return empty context - start fresh
    if (resumeMode === PostRecordResumeMode.RESTART) {
      this.logger.debug('RESTART mode - returning empty resume context');
      return context;
    }

    // Get source URLs for cross-website propagation (needed for all non-RESTART modes)
    const sourceUrls = await this.postEventRepository.getSourceUrlsByAccount(
      priorPostRecordId,
    );
    context.sourceUrlsByAccount = sourceUrls;

    // For CONTINUE_RETRY mode: skip only completed accounts, retry all files
    if (resumeMode === PostRecordResumeMode.CONTINUE_RETRY) {
      this.logger.debug('CONTINUE_RETRY mode - querying completed accounts');

      const completedAccountIds =
        await this.postEventRepository.getSuccessfullyCompletedAccountIds(
          priorPostRecordId,
        );

      context.completedAccountIds = new Set(completedAccountIds);

      this.logger
        .withMetadata({
          completedAccountCount: completedAccountIds.length,
        })
        .debug('Built CONTINUE_RETRY resume context');

      return context;
    }

    // For CONTINUE mode: skip completed accounts AND already-posted files
    if (resumeMode === PostRecordResumeMode.CONTINUE) {
      this.logger.debug('CONTINUE mode - querying completed accounts and posted files');

      // Get completed accounts
      const completedAccountIds =
        await this.postEventRepository.getSuccessfullyCompletedAccountIds(
          priorPostRecordId,
        );
      context.completedAccountIds = new Set(completedAccountIds);

      // Get all posted files grouped by account
      const allEvents = await this.postEventRepository.findByPostRecordId(
        priorPostRecordId,
      );

      // Build map of account -> posted file IDs
      for (const event of allEvents) {
        if (
          event.eventType === 'FILE_POSTED' &&
          event.accountId &&
          event.fileId
        ) {
          const existing = context.postedFilesByAccount.get(event.accountId);
          if (existing) {
            existing.add(event.fileId);
          } else {
            context.postedFilesByAccount.set(
              event.accountId,
              new Set([event.fileId]),
            );
          }
        }
      }

      this.logger
        .withMetadata({
          completedAccountCount: completedAccountIds.length,
          accountsWithPostedFiles: context.postedFilesByAccount.size,
        })
        .debug('Built CONTINUE resume context');

      return context;
    }

    // Fallback (shouldn't reach here)
    return context;
  }

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
}

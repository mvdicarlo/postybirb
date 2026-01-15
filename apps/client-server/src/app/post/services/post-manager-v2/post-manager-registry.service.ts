import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { EntityId, SubmissionType } from '@postybirb/types';
import { PostRecord } from '../../../drizzle/models';
import { PostRecordFactory, ResumeContext } from '../post-record-factory';
import { BasePostManager } from './base-post-manager.service';
import { FileSubmissionPostManager } from './file-submission-post-manager.service';
import { MessageSubmissionPostManager } from './message-submission-post-manager.service';

/**
 * Registry for PostManager instances.
 * Maps submission types to appropriate PostManager implementations.
 * Allows multiple submissions to be posted concurrently.
 * @class PostManagerRegistry
 */
@Injectable()
export class PostManagerRegistry {
  private readonly logger = Logger(this.constructor.name);

  private readonly managers: Map<SubmissionType, BasePostManager>;

  constructor(
    private readonly fileSubmissionPostManager: FileSubmissionPostManager,
    private readonly messageSubmissionPostManager: MessageSubmissionPostManager,
    private readonly postRecordFactory: PostRecordFactory,
  ) {
    this.managers = new Map<SubmissionType, BasePostManager>();
    this.managers.set(SubmissionType.FILE, fileSubmissionPostManager);
    this.managers.set(SubmissionType.MESSAGE, messageSubmissionPostManager);
  }

  /**
   * Get a PostManager for a submission type.
   * @param {SubmissionType} type - The submission type
   * @returns {BasePostManager | undefined} The PostManager instance
   */
  public getManager(type: SubmissionType): BasePostManager | undefined {
    return this.managers.get(type);
  }

  /**
   * Start posting for a post record.
   * Determines the appropriate PostManager and starts posting.
   * @param {PostRecord} postRecord - The post record to start
   * @param {EntityId} [priorPostRecordId] - Optional prior post record ID for resume
   */
  public async startPost(
    postRecord: PostRecord,
    priorPostRecordId?: EntityId,
  ): Promise<void> {
    const submissionType = postRecord.submission.type;
    const manager = this.getManager(submissionType);

    if (!manager) {
      this.logger.error(`No PostManager found for type: ${submissionType}`);
      throw new Error(`No PostManager found for type: ${submissionType}`);
    }

    if (manager.isPosting()) {
      this.logger.warn(
        `PostManager for ${submissionType} is already posting, cannot start new post`,
      );
      return;
    }

    // Build resume context if this is a resumed post
    let resumeContext: ResumeContext | undefined;
    if (priorPostRecordId) {
      resumeContext = await this.postRecordFactory.buildResumeContext(
        postRecord.submissionId,
        priorPostRecordId,
        postRecord.resumeMode,
      );
    }

    await manager.startPost(postRecord, resumeContext);
  }

  /**
   * Cancel posting for a submission if it's currently running.
   * Checks all managers to find the one handling this submission.
   * @param {EntityId} submissionId - The submission ID to cancel
   * @returns {Promise<boolean>} True if cancelled, false if not found
   */
  public async cancelIfRunning(submissionId: EntityId): Promise<boolean> {
    for (const manager of this.managers.values()) {
      if (await manager.cancelIfRunning(submissionId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific submission type's manager is posting.
   * @param {SubmissionType} type - The submission type
   * @returns {boolean} True if posting
   */
  public isPostingType(type: SubmissionType): boolean {
    const manager = this.getManager(type);
    return manager?.isPosting() ?? false;
  }
}

/**
 * SubmissionRecord - Concrete class for submission data.
 */

import {
  type ISubmissionDto,
  type ISubmissionFileDto,
  type ISubmissionMetadata,
  type ISubmissionScheduleInfo,
  type IWebsiteFormFields,
  type PostQueueRecordDto,
  type PostRecordDto,
  PostRecordState,
  type SubmissionId,
  type SubmissionType,
  type ValidationResult,
  type WebsiteOptionsDto
} from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing a submission entity.
 */
export class SubmissionRecord extends BaseRecord {
  readonly type: SubmissionType;
  readonly isScheduled: boolean;
  readonly isTemplate: boolean;
  readonly isMultiSubmission: boolean;
  readonly isArchived: boolean;
  readonly schedule: ISubmissionScheduleInfo;
  readonly files: ISubmissionFileDto[];
  readonly options: WebsiteOptionsDto[];
  readonly posts: PostRecordDto[];
  readonly validations: ValidationResult[];
  readonly postQueueRecord?: PostQueueRecordDto;
  readonly metadata: ISubmissionMetadata;
  readonly order: number;

  // Cached computed values — safe because all data is immutable after construction
  private readonly _primaryFile: ISubmissionFileDto | undefined;
  private readonly _lastModified: Date;
  private readonly _sortedPosts: PostRecordDto[];
  private readonly _sortedPostsDescending: PostRecordDto[];

  constructor(dto: ISubmissionDto) {
    super(dto);
    this.type = dto.type;
    this.isScheduled = dto.isScheduled;
    this.isTemplate = dto.isTemplate;
    this.isMultiSubmission = dto.isMultiSubmission;
    this.isArchived = dto.isArchived;
    this.schedule = dto.schedule;
    this.files = dto.files ?? [];
    this.options = dto.options ?? [];
    this.posts = dto.posts ?? [];
    this.validations = dto.validations ?? [];
    this.postQueueRecord = dto.postQueueRecord;
    this.metadata = dto.metadata;
    this.order = dto.order;

    // Pre-compute expensive derived values
    this._primaryFile = this.files.length > 0
      ? [...this.files].sort((a, b) => a.order - b.order)[0]
      : undefined;
    this._sortedPosts = this.posts.length > 0
      ? [...this.posts].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      : [];
    this._sortedPostsDescending = this.posts.length > 0
      ? [...this.posts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      : [];
    this._lastModified = this.computeLastModified();
  }

  /**
   * Get the submission id with proper typing.
   */
  get submissionId(): SubmissionId {
    return this.id as SubmissionId;
  }

  /**
   * Check if the submission has files.
   */
  get hasFiles(): boolean {
    return this.files.length > 0;
  }

  /**
   * Get the primary/first file if available.
   */
  get primaryFile(): ISubmissionFileDto | undefined {
    return this._primaryFile;
  }

  /**
   * Check if the submission has validation errors.
   */
  get hasErrors(): boolean {
    return this.validations.some((v) => v.errors && v.errors.length > 0);
  }

  /**
   * Check if the submission has validation warnings.
   */
  get hasWarnings(): boolean {
    return this.validations.some((v) => v.warnings && v.warnings.length > 0);
  }

  /**
   * Check if the submission is queued for posting.
   */
  get isQueued(): boolean {
    return this.postQueueRecord !== undefined;
  }

  /**
   * Check if the submission is currently being posted.
   */
  get isPosting(): boolean {
    return this.posts.some((post) => post.state === 'RUNNING');
  }

  /**
   * Check if the submission has any website options configured
   * (excluding the default option).
   */
  get hasWebsiteOptions(): boolean {
    return this.options.some((o) => !o.isDefault);
  }

  /**
   * Get the scheduled date if scheduled.
   */
  get scheduledDate(): Date | null {
    if (!this.schedule.scheduledFor) {
      return null;
    }
    return new Date(this.schedule.scheduledFor);
  }

  /**
   * Get the default website options for this submission.
   * The default option contains global settings like title.
   */
  getDefaultOptions<O extends IWebsiteFormFields>():
    | WebsiteOptionsDto<O>
    | undefined {
    return this.options.find((o) => o.isDefault) as
      | WebsiteOptionsDto<O>
      | undefined;
  }

  /**
   * Get the submission title.
   * For templates, returns the template name.
   * Otherwise returns the title from default options.
   */
  get title(): string {
    if (this.isTemplate && this.metadata?.template?.name) {
      return this.metadata.template.name;
    }
    const defaultOptions = this.getDefaultOptions();
    return defaultOptions?.data?.title ?? '';
  }

  /**
   * Get the most recent modification date across the submission,
   * its files, and its website options.
   */
  get lastModified(): Date {
    return this._lastModified;
  }

  private computeLastModified(): Date {
    let latest = this.updatedAt;

    for (const file of this.files) {
      const fileDate = new Date(file.updatedAt);
      if (fileDate > latest) {
        latest = fileDate;
      }
    }

    for (const option of this.options) {
      const optionDate = new Date(option.updatedAt);
      if (optionDate > latest) {
        latest = optionDate;
      }
    }

    return latest;
  }

  /**
   * Check if the submission has a schedule time or cron expression configured.
   */
  get hasScheduleTime(): boolean {
    return Boolean(this.schedule.scheduledFor || this.schedule.cron);
  }

  // =============================================================================
  // Post Record Methods
  // =============================================================================

  /**
   * Get all post records sorted by creation date (oldest first).
   * This provides a chronological view of posting attempts.
   */
  get sortedPosts(): PostRecordDto[] {
    return this._sortedPosts;
  }

  /**
   * Get all post records sorted by creation date (newest first).
   * This provides a reverse chronological view for display.
   */
  get sortedPostsDescending(): PostRecordDto[] {
    return this._sortedPostsDescending;
  }

  /**
   * Get the most recent post record.
   */
  get latestPost(): PostRecordDto | undefined {
    if (this.posts.length === 0) return undefined;
    return this.sortedPosts[this.sortedPosts.length - 1];
  }

  /**
   * Get the most recent completed post record (DONE or FAILED).
   */
  get latestCompletedPost(): PostRecordDto | undefined {
    const completed = this.sortedPosts.filter(
      (post) => post.state === PostRecordState.DONE || post.state === PostRecordState.FAILED
    );
    return completed[completed.length - 1];
  }

  /**
   * Get posting statistics for this submission.
   * Counts are based on individual post records.
   */
  get postingStats(): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    runningAttempts: number;
  } {
    const successful = this.posts.filter((p) => p.state === PostRecordState.DONE);
    const failed = this.posts.filter((p) => p.state === PostRecordState.FAILED);
    const running = this.posts.filter((p) => p.state === PostRecordState.RUNNING);

    return {
      totalAttempts: this.posts.length,
      successfulAttempts: successful.length,
      failedAttempts: failed.length,
      runningAttempts: running.length,
    };
  }

  /**
   * Check if this submission has ever been successfully posted.
   */
  get hasBeenPostedSuccessfully(): boolean {
    return this.posts.some((p) => p.state === PostRecordState.DONE);
  }

  /**
   * Check if this submission has any failed posting attempts.
   */
  get hasFailedPostingAttempts(): boolean {
    return this.posts.some((p) => p.state === PostRecordState.FAILED);
  }

  /**
   * Check if this submission is currently being posted.
   */
  get isCurrentlyPosting(): boolean {
    return this.posts.some((p) => p.state === PostRecordState.RUNNING);
  }
}

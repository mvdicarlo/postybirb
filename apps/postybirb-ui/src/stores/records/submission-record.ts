/**
 * SubmissionRecord - Concrete class for submission data.
 */

import {
    type AccountId,
    type IEntityDto,
    type IPost,
    type ISubmissionDto,
    type ISubmissionFileDto,
    type ISubmissionMetadata,
    type ISubmissionScheduleInfo,
    type IUnitOfWork,
    type IWebsiteFormFields,
    type PostQueueRecordDto,
    type PostRecordDto,
    type SubmissionId,
    type SubmissionType,
    UnitOfWorkState,
    type ValidationResult,
    type WebsiteOptionsDto
} from '@postybirb/types';
import { BaseRecord } from './base-record';

/** Aggregate counts of a post's active (non-evicted) units of work. */
export interface UnitOfWorkStats {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  pending: number;
  cancelled: number;
  rateLimited: number;
}

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
  /** @deprecated Legacy post records; only the post-creation flow still reads these. */
  readonly posts: PostRecordDto[];
  readonly post?: IEntityDto<IPost>;
  readonly validations: ValidationResult[];
  readonly postQueueRecord?: PostQueueRecordDto;
  readonly metadata: ISubmissionMetadata;
  readonly dependsOn: SubmissionId[];
  readonly order: number;

  // Cached computed values — safe because all data is immutable after construction
  private readonly cachedPrimaryFile: ISubmissionFileDto | undefined;
  private readonly cachedLastModified: Date;
  private readonly cachedSortedPosts: PostRecordDto[];
  private readonly cachedUnitsOfWork: IUnitOfWork[];
  private readonly cachedActiveUnitsOfWork: IUnitOfWork[];
  private readonly cachedUnitsOfWorkByAccount: Map<AccountId, IUnitOfWork[]>;
  private readonly cachedUnitStats: UnitOfWorkStats;

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
    this.post = dto.post;
    this.validations = dto.validations ?? [];
    this.postQueueRecord = dto.postQueueRecord;
    this.metadata = dto.metadata;
    this.dependsOn = dto.dependsOn;
    this.order = dto.order;

    // Pre-compute expensive derived values
    this.cachedPrimaryFile = this.files.length > 0
      ? [...this.files].sort((a, b) => a.order - b.order)[0]
      : undefined;
    this.cachedSortedPosts = this.posts.length > 0
      ? [...this.posts].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      : [];
    this.cachedUnitsOfWork = this.post?.unitsOfWork ?? [];
    this.cachedActiveUnitsOfWork = this.cachedUnitsOfWork.filter(
      (unit) => !unit.evicted
    );
    this.cachedUnitsOfWorkByAccount = this.groupUnitsOfWorkByAccount();
    this.cachedUnitStats = this.computeUnitStats();
    this.cachedLastModified = this.computeLastModified();
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
    return this.cachedPrimaryFile;
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
    return this.post !== undefined && !this.post.completed;
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
    return this.cachedLastModified;
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
  // Post / Unit of Work Methods
  // =============================================================================

  /**
   * Every unit of work on the current post, including evicted (superseded) ones.
   */
  get unitsOfWork(): IUnitOfWork[] {
    return this.cachedUnitsOfWork;
  }

  /**
   * Units of work that still count toward the current attempt.
   */
  get activeUnitsOfWork(): IUnitOfWork[] {
    return this.cachedActiveUnitsOfWork;
  }

  /**
   * Units of work grouped by account, active units first, each group oldest first.
   */
  get unitsOfWorkByAccount(): Map<AccountId, IUnitOfWork[]> {
    return this.cachedUnitsOfWorkByAccount;
  }

  /**
   * Counts of active units by state.
   */
  get unitStats(): UnitOfWorkStats {
    return this.cachedUnitStats;
  }

  /**
   * Check if the submission has any recorded posting work.
   */
  get hasPostHistory(): boolean {
    return this.cachedUnitsOfWork.length > 0;
  }

  /**
   * Check if any active unit of work failed.
   */
  get hasFailedUnits(): boolean {
    return this.cachedActiveUnitsOfWork.some(
      (unit) => unit.state === UnitOfWorkState.FAILED
    );
  }

  /**
   * Check if any active unit of work is currently executing or validating.
   */
  get hasRunningUnits(): boolean {
    return this.cachedUnitStats.running > 0;
  }

  /**
   * Check if any active unit of work is waiting out a rate limit.
   */
  get hasRateLimitedUnits(): boolean {
    return this.cachedUnitStats.rateLimited > 0;
  }

  /**
   * Earliest time a rate limited unit of work is allowed to retry.
   */
  get nextRateLimitRetryAt(): string | undefined {
    return this.cachedActiveUnitsOfWork
      .filter((unit) => unit.state === UnitOfWorkState.RATE_LIMITED)
      .map((unit) => unit.rateLimitedUntil)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
  }

  /**
   * Check if the current post finished without being cancelled.
   */
  get isPostCompleted(): boolean {
    return Boolean(this.post?.completed && !this.post.cancelled);
  }

  /**
   * Check if the current post finished with every active unit succeeding.
   * Dependent submissions are only released once this is true.
   */
  get isPostSuccessful(): boolean {
    return (
      this.isPostCompleted &&
      this.cachedActiveUnitsOfWork.length > 0 &&
      this.cachedActiveUnitsOfWork.every(
        (unit) => unit.state === UnitOfWorkState.SUCCEEDED
      )
    );
  }

  /**
   * Check if the current post was cancelled.
   */
  get isPostCancelled(): boolean {
    return Boolean(this.post?.cancelled);
  }

  /**
   * When the current post was created.
   */
  get postStartedAt(): string | undefined {
    return this.post?.createdAt;
  }

  /**
   * When the current post settled, derived from its most recently updated unit.
   */
  get postFinishedAt(): string | undefined {
    if (!this.post?.completed || this.cachedActiveUnitsOfWork.length === 0) {
      return undefined;
    }
    return this.cachedActiveUnitsOfWork.reduce(
      (latest, unit) => (unit.updatedAt > latest ? unit.updatedAt : latest),
      this.cachedActiveUnitsOfWork[0].updatedAt
    );
  }

  /**
   * Get the most recent post record.
   *
   * @deprecated Legacy post record accessor; only the post-creation flow still reads this.
   */
  get latestPost(): PostRecordDto | undefined {
    if (this.cachedSortedPosts.length === 0) return undefined;
    return this.cachedSortedPosts[this.cachedSortedPosts.length - 1];
  }

  private groupUnitsOfWorkByAccount(): Map<AccountId, IUnitOfWork[]> {
    const grouped = new Map<AccountId, IUnitOfWork[]>();

    for (const unit of this.cachedUnitsOfWork) {
      const existing = grouped.get(unit.accountId);
      if (existing) {
        existing.push(unit);
      } else {
        grouped.set(unit.accountId, [unit]);
      }
    }

    for (const units of grouped.values()) {
      units.sort((a, b) => {
        if (a.evicted !== b.evicted) {
          return a.evicted ? 1 : -1;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    return grouped;
  }

  private computeUnitStats(): UnitOfWorkStats {
    const stats: UnitOfWorkStats = {
      total: this.cachedActiveUnitsOfWork.length,
      succeeded: 0,
      failed: 0,
      running: 0,
      pending: 0,
      cancelled: 0,
      rateLimited: 0,
    };

    for (const unit of this.cachedActiveUnitsOfWork) {
      switch (unit.state) {
        case UnitOfWorkState.SUCCEEDED:
          stats.succeeded += 1;
          break;
        case UnitOfWorkState.FAILED:
          stats.failed += 1;
          break;
        case UnitOfWorkState.EXECUTING:
        case UnitOfWorkState.VALIDATING:
          stats.running += 1;
          break;
        case UnitOfWorkState.CANCELLED:
          stats.cancelled += 1;
          break;
        case UnitOfWorkState.RATE_LIMITED:
          stats.rateLimited += 1;
          break;
        default:
          stats.pending += 1;
          break;
      }
    }

    return stats;
  }
}

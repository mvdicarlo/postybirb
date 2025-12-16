/**
 * SubmissionRecord - Concrete class for submission data.
 */

import type {
  ISubmissionDto,
  ISubmissionFileDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  PostQueueRecordDto,
  PostRecordDto,
  SubmissionId,
  SubmissionType,
  ValidationResult,
  WebsiteOptionsDto,
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
    return this.files[0];
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
    if (!this.isScheduled || !this.schedule.scheduledFor) {
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
    let latest = this.updatedAt;

    // Check files for more recent updates
    for (const file of this.files) {
      const fileDate = new Date(file.updatedAt);
      if (fileDate > latest) {
        latest = fileDate;
      }
    }

    // Check website options for more recent updates
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
}

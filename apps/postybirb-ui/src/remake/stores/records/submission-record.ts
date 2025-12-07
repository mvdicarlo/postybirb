/**
 * SubmissionRecord - Concrete class for submission data.
 */

import type {
    ISubmissionDto,
    ISubmissionFileDto,
    ISubmissionMetadata,
    ISubmissionScheduleInfo,
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
   * Get the submission name.
   * For file submissions, uses the primary file name.
   * For templates, uses the template name from metadata.
   */
  get name(): string {
    // Check for template name in metadata
    if (this.metadata?.template?.name) {
      return this.metadata.template.name;
    }
    // Fall back to primary file name
    if (this.files.length > 0 && this.files[0].fileName) {
      return this.files[0].fileName;
    }
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return 'Untitled';
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
   * Get the scheduled date if scheduled.
   */
  get scheduledDate(): Date | null {
    if (!this.isScheduled || !this.schedule.scheduledFor) {
      return null;
    }
    return new Date(this.schedule.scheduledFor);
  }
}

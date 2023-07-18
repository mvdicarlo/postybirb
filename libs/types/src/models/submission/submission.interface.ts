import { Collection } from '@mikro-orm/core';
import { SubmissionType } from '../../enums';
import { EntityId, IEntity } from '../database/entity.interface';
import { IWebsiteOptions } from '../website-options/website-options.interface';
import { ISubmissionFile } from './submission-file.interface';
import { ISubmissionMetadata } from './submission-metadata.interface';
import { ISubmissionScheduleInfo } from './submission-schedule-info.interface';
import { IWebsiteFormFields } from './website-form-fields.interface';

export type SubmissionId = EntityId;

/**
 * Represents a submission entity.
 * @interface ISubmission
 * @template T - The type of metadata associated with the submission.
 * @extends {IEntity}
 */
export interface ISubmission<
  T extends ISubmissionMetadata = ISubmissionMetadata
> extends IEntity {
  /**
   * The type of the submission.
   * @type {SubmissionType}
   */
  type: SubmissionType;

  /**
   * The options associated with the submission.
   * @type {Collection<IWebsiteOptions<IWebsiteFormFields>>}
   */
  options: Collection<IWebsiteOptions<IWebsiteFormFields>>;

  /**
   * Indicates whether the submission is scheduled.
   * @type {boolean}
   */
  isScheduled: boolean;

  /**
   * Information about the schedule for the submission.
   * @type {ISubmissionScheduleInfo}
   */
  schedule: ISubmissionScheduleInfo;

  /**
   * The files associated with the submission.
   * @type {Collection<ISubmissionFile>}
   */
  files: Collection<ISubmissionFile>;

  /**
   * The metadata associated with the submission.
   * @type {T}
   */
  metadata: T;
}

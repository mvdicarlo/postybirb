import { Collection } from '@mikro-orm/core';
import { SubmissionType } from '../enums';
import { IBaseEntity } from './base-entity';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { IBaseWebsiteOptions } from './base-website-options';
import { ISubmissionFile } from './file';
import { ISubmissionOptions } from './submission-options';
import { ISubmissionScheduleInfo } from './submission-schedule-info';

export interface ISubmission<
  T extends IBaseSubmissionMetadata = IBaseSubmissionMetadata
> extends IBaseEntity {
  type: SubmissionType;
  options: Collection<ISubmissionOptions<IBaseWebsiteOptions>>;
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  files: Collection<ISubmissionFile>;
  metadata: T; // Any additional information that a submission might need
}

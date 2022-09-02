import { Collection } from '@mikro-orm/core';
import { IBaseEntity } from '../../database/models/base-entity';
import { ISubmissionFile } from '../../file/models/file';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { BaseWebsiteOptions } from './base-website-options';
import { ISubmissionOptions } from './submission-options';
import { ISubmissionScheduleInfo } from './submission-schedule-info';

export interface ISubmission<
  T extends IBaseSubmissionMetadata = IBaseSubmissionMetadata
> extends IBaseEntity {
  type: SubmissionType;
  options: Collection<ISubmissionOptions<BaseWebsiteOptions>, ISubmission<T>>;
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  files: Collection<ISubmissionFile>;
  metadata: T; // Any additional information that a submission might need
}

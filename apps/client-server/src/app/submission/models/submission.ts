import { Collection } from '@mikro-orm/core';
import { ISubmissionFile } from '../../file/models/file';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { BaseOptions } from './base-website-options';
import { ISubmissionOptions } from './submission-options';
import { ISubmissionScheduleInfo } from './submission-schedule-info';

export interface ISubmission<T extends IBaseSubmissionMetadata> {
  id: string;
  type: SubmissionType;
  options: Collection<ISubmissionOptions<BaseOptions>>;
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  files: Collection<ISubmissionFile>;
  metadata: T; // Any additional information that a submission might need
  updatedAt: Date;
  createdAt: Date;
}

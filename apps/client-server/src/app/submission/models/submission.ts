import SubmissionType from '../enums/submission-type';
import { BaseOptions } from './base-website-options';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { ISubmissionOptions } from './submission-options';
import { ISubmissionScheduleInfo } from './submission-schedule-info';
import { ISubmissionFile } from '../../file/models/file';

export interface ISubmission<T extends IBaseSubmissionMetadata> {
  id: string;
  type: SubmissionType;
  options: ISubmissionOptions<BaseOptions>[];
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  files: ISubmissionFile[];
  metadata: T; // Any additional information that a submission might need
  updatedAt: Date;
  createdAt: Date;
}

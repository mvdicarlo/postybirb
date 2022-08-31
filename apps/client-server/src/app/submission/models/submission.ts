import SubmissionType from '../enums/submission-type';
import { BaseWebsiteOptions } from './base-website-options';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { ISubmissionPart } from './submission-part';
import { ISubmissionScheduleInfo } from './submission-schedule-info';
import { ISubmissionFile } from '../../file/models/file';

export interface ISubmission<T extends IBaseSubmissionMetadata> {
  id: string;
  type: SubmissionType;
  parts: ISubmissionPart<BaseWebsiteOptions>[];
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  files: ISubmissionFile[];
  metadata: T; // Any additional information that a submission might need
  updatedAt: Date;
  createdAt: Date;
}

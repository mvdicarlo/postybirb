import SubmissionType from '../enums/submission-type.enum';
import BaseWebsiteOptions from '../models_maybe/base-website-options.model';
import { IBaseSubmissionMetadata } from './base-submission-metadata.model';
import { ISubmissionPart } from './submission-part.interface';
import { ISubmissionScheduleInfo } from './submission-schedule-info.interface';

export interface ISubmission<T extends IBaseSubmissionMetadata> {
  id: string;
  type: SubmissionType;
  parts: ISubmissionPart<BaseWebsiteOptions>[];
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  metadata: T; // Any additional information that a submission might need
  lastUpdated: Date;
  created: Date;
}

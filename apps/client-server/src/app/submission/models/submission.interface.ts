import { SafeObject } from '../../shared/types/safe-object.type';
import { ScheduleType } from '../enums/schedule-type.enum';
import SubmissionType from '../enums/submission-type.enum';
import { ISubmissionPart } from './submission-part.interface';

export interface ISubmission<T extends SafeObject> {
  id: string;
  type: SubmissionType;
  parts: ISubmissionPart<SafeObject>[];
  scheduleType: ScheduleType;
  isScheduled: boolean;
  scheduledFor: string; // CRON string or Date string
  metadata: T; // Any additional information that a submission might need
}

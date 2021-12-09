import { SafeObject } from '../../shared/types/safe-object.type';
import SubmissionType from '../enums/submission-type.enum';
import { ISubmissionPart } from './submission-part.interface';
import { ISubmissionScheduleInfo } from './submission-schedule-info.interface';

export interface ISubmission<T extends SafeObject> {
  id: string;
  type: SubmissionType;
  parts: ISubmissionPart<SafeObject>[];
  isScheduled: boolean;
  schedule: ISubmissionScheduleInfo;
  metadata: T; // Any additional information that a submission might need
}

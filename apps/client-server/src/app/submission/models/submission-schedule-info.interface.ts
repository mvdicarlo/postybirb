import { ScheduleType } from '../enums/schedule-type.enum';

export interface ISubmissionScheduleInfo {
  scheduledFor?: string; // CRON string or Date string
  scheduleType: ScheduleType;
}

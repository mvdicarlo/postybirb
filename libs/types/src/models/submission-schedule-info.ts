import { ScheduleType } from '../enums';

export interface ISubmissionScheduleInfo {
  scheduledFor?: string; // CRON string or Date string
  scheduleType: ScheduleType;
}

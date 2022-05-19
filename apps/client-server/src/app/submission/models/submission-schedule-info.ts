import { ScheduleType } from '../enums/schedule-type';

export interface ISubmissionScheduleInfo {
  scheduledFor?: string; // CRON string or Date string
  scheduleType: ScheduleType;
}

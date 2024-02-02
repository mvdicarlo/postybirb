import { ScheduleType } from '../../enums';

/**
 * Represents information about the schedule for a submission.
 * @interface ISubmissionScheduleInfo
 */
export interface ISubmissionScheduleInfo {
  /**
   * The time at which the submission is scheduled, specified as a CRON string or a Date string.
   *
   * @type {string}
   */
  scheduledFor?: string;
  /**
   * The type of schedule for the submission.
   * @type {ScheduleType}
   */
  scheduleType: ScheduleType;

  /**
   * The CRON string for the schedule.
   * @type {string}
   */
  cron?: string;
}

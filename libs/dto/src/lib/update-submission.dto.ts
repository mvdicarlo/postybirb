import { ScheduleType } from '@postybirb/types';

export interface IUpdateSubmissionDto {
  isScheduled: boolean;

  scheduledFor: string | null;

  scheduleType: ScheduleType;
}

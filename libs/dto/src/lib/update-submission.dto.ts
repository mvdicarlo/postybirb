import { ScheduleType } from '@postybirb/types';

export interface IUpdateSubmissionDto {
  id: string;

  isScheduled: boolean;

  scheduledFor: string | null;

  scheduleType: ScheduleType;
}

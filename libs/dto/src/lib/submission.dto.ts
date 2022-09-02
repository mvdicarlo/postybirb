// TODO fill in better
export interface ISubmissionDto<T> {
  createdAt: Date;
  files: any[];
  id: string;
  isScheduled: boolean;
  metadata: T;
  options: any[];
  schedule: ISubmissionScheduleInfoDto;
  type: 'MESSAGE' | 'FILE';
  updatedAt: Date;
}

export interface ISubmissionScheduleInfoDto {
  scheduledFor?: string; // CRON string or Date string
  scheduleType: ScheduleType;
}

export enum ScheduleType {
  SINGLE = 'single',
  RECURRING = 'recurring',
}

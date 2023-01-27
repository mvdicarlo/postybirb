import {
  IBaseWebsiteOptions,
  ISubmissionOptions,
  ScheduleType,
} from '@postybirb/types';

export interface IUpdateSubmissionDto {
  id: string;

  isScheduled: boolean;

  scheduledFor: string | null | undefined;

  scheduleType: ScheduleType;

  deletedOptions?: ISubmissionOptions<IBaseWebsiteOptions>[];

  newOrUpdatedOptions?: ISubmissionOptions<IBaseWebsiteOptions>[];
}

import {
  BaseWebsiteOptions,
  ISubmissionOptions,
  ScheduleType,
} from '@postybirb/types';

export interface IUpdateSubmissionDto {
  id: string;

  isScheduled: boolean;

  scheduledFor: string | null | undefined;

  scheduleType: ScheduleType;

  deletedOptions?: ISubmissionOptions<BaseWebsiteOptions>[];

  newOrUpdatedOptions?: ISubmissionOptions<BaseWebsiteOptions>[];
}

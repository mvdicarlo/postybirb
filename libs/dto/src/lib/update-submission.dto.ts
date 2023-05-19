import {
  FileSubmissionMetadata,
  ISubmissionMetadata,
  IWebsiteFormFields,
  IWebsiteOptions,
  ScheduleType,
} from '@postybirb/types';

export interface IUpdateSubmissionDto {
  id: string;

  isScheduled: boolean;

  scheduledFor: string | null | undefined;

  scheduleType: ScheduleType;

  deletedOptions?: IWebsiteOptions<IWebsiteFormFields>[];

  newOrUpdatedOptions?: IWebsiteOptions<IWebsiteFormFields>[];

  metadata?: ISubmissionMetadata | FileSubmissionMetadata;
}

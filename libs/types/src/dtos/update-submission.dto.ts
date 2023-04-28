import {
  FileSubmissionMetadata,
  ISubmissionMetadata,
  ISubmissionFields,
  ISubmissionAccountData,
  ScheduleType,
} from '@postybirb/types';

export interface IUpdateSubmissionDto {
  id: string;

  isScheduled: boolean;

  scheduledFor: string | null | undefined;

  scheduleType: ScheduleType;

  deletedOptions?: ISubmissionAccountData<ISubmissionFields>[];

  newOrUpdatedOptions?: ISubmissionAccountData<ISubmissionFields>[];

  metadata?: ISubmissionMetadata | FileSubmissionMetadata;
}

import {
  ISubmissionFile,
  ISubmissionMetadata,
  ISubmissionAccountData,
  ISubmissionScheduleInfo,
  ISubmissionFields,
} from '@postybirb/types';

export interface ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata
> {
  createdAt: Date;
  files: ISubmissionFile[];
  id: string;
  isScheduled: boolean;
  metadata: T;
  options: ISubmissionAccountData<ISubmissionFields>[];
  schedule: ISubmissionScheduleInfo;
  type: 'MESSAGE' | 'FILE';
  updatedAt: Date;
}

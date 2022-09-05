import {
  ISubmissionFile,
  IBaseSubmissionMetadata,
  ISubmissionOptions,
  ISubmissionScheduleInfo,
  BaseWebsiteOptions,
} from '@postybirb/types';

export interface ISubmissionDto<
  T extends IBaseSubmissionMetadata = IBaseSubmissionMetadata
> {
  createdAt: Date;
  files: ISubmissionFile[];
  id: string;
  isScheduled: boolean;
  metadata: T;
  options: ISubmissionOptions<BaseWebsiteOptions>[];
  schedule: ISubmissionScheduleInfo;
  type: 'MESSAGE' | 'FILE';
  updatedAt: Date;
}

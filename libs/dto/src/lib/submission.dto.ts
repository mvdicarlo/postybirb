import {
  ISubmissionFile,
  IBaseSubmissionMetadata,
  ISubmissionOptions,
  ISubmissionScheduleInfo,
  IBaseWebsiteOptions,
} from '@postybirb/types';

export interface ISubmissionDto<
  T extends IBaseSubmissionMetadata = IBaseSubmissionMetadata
> {
  createdAt: Date;
  files: ISubmissionFile[];
  id: string;
  isScheduled: boolean;
  metadata: T;
  options: ISubmissionOptions<IBaseWebsiteOptions>[];
  schedule: ISubmissionScheduleInfo;
  type: 'MESSAGE' | 'FILE';
  updatedAt: Date;
}

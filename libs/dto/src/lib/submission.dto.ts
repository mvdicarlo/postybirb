import {
  ISubmissionFile,
  ISubmissionMetadata,
  IWebsiteOptions,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
} from '@postybirb/types';

export interface ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata
> {
  createdAt: Date;
  files: ISubmissionFile[];
  id: string;
  isScheduled: boolean;
  metadata: T;
  options: IWebsiteOptions<IWebsiteFormFields>[];
  schedule: ISubmissionScheduleInfo;
  type: 'MESSAGE' | 'FILE';
  updatedAt: Date;
}

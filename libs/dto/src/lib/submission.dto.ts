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
  createdAt: string;
  files: ISubmissionFile[];
  id: string;
  isScheduled: boolean;
  metadata: T;
  options: IWebsiteOptions<IWebsiteFormFields>[]; // TODO should this be dto?
  schedule: ISubmissionScheduleInfo;
  type: 'MESSAGE' | 'FILE';
  updatedAt: string;
}

import { IBaseWebsiteOptions } from '@postybirb/types';

export interface IValidateSubmissionOptionsDto<
  T extends IBaseWebsiteOptions = IBaseWebsiteOptions
> {
  submissionId: string;

  accountId: string;

  options: T;

  defaultOptions: IBaseWebsiteOptions;
}

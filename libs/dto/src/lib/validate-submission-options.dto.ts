import { BaseWebsiteOptions } from '@postybirb/types';

export interface IValidateSubmissionOptionsDto<
  T extends BaseWebsiteOptions = BaseWebsiteOptions
> {
  submissionId: string;

  accountId: string;

  options: T;
}

import { IWebsiteFormFields } from '@postybirb/types';

export interface IValidateSubmissionOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> {
  submissionId: string;

  accountId: string;

  options: T;

  defaultOptions: IWebsiteFormFields;
}

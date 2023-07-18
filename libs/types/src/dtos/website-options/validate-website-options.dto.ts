import { AccountId, IWebsiteFormFields, SubmissionId } from '../../models';

export interface IValidateWebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> {
  submission: SubmissionId;
  account: AccountId;
  options: T;
  defaultOptions: IWebsiteFormFields;
}

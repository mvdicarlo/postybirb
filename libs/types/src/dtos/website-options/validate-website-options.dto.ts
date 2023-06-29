import { IWebsiteFormFields, SubmissionId } from '../../models';
import { AccountId } from '../../models/account/account.type';

export interface IValidateWebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> {
  submission: SubmissionId;
  account: AccountId;
  options: T;
  defaultOptions: IWebsiteFormFields;
}

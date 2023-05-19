import { IWebsiteFormFields, SubmissionId } from '../../models';
import { AccountId } from '../../models/account/account.type';

export interface IValidateWebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> {
  submissionId: SubmissionId;
  accountId: AccountId;
  options: T;
  defaultOptions: IWebsiteFormFields;
}

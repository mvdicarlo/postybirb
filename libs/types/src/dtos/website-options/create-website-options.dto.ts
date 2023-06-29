import { IWebsiteFormFields, SubmissionId } from '../../models';
import { AccountId } from '../../models/account/account.type';

export type ICreateWebsiteOptionsDto = {
  submission: SubmissionId;
  account: AccountId;
  data: IWebsiteFormFields;
};

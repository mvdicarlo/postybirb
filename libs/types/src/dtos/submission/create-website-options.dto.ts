import { IWebsiteFormFields, SubmissionId } from '../../models';
import { AccountId } from '../../models/account/account.type';

export type ICreateWebsiteOptionsDto = {
  submissionId: SubmissionId;
  accountId: AccountId;
  data: IWebsiteFormFields;
};

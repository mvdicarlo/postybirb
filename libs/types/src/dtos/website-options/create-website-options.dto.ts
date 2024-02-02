import { AccountId, IWebsiteFormFields, SubmissionId } from '../../models';

export type ICreateWebsiteOptionsDto = {
  submission: SubmissionId;
  account: AccountId;
  data: IWebsiteFormFields;
};

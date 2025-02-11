import { AccountId, IWebsiteFormFields, SubmissionId } from '../../models';

export type ICreateWebsiteOptionsDto = {
  submissionId: SubmissionId;
  accountId: AccountId;
  data: IWebsiteFormFields;
};

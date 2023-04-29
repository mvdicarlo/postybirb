import { ISubmissionFields, SubmissionId } from '../../models';
import { AccountId } from '../../models/account/account.type';

export interface IValidateSubmissionOptionsDto<
  T extends ISubmissionFields = ISubmissionFields
> {
  submissionId: SubmissionId;
  accountId: AccountId;
  options: T;
  defaultOptions: ISubmissionFields;
}

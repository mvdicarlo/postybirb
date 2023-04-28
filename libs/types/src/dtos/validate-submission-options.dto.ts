import { ISubmissionFields } from '@postybirb/types';

export interface IValidateSubmissionOptionsDto<
  T extends ISubmissionFields = ISubmissionFields
> {
  submissionId: string;

  accountId: string;

  options: T;

  defaultOptions: ISubmissionFields;
}

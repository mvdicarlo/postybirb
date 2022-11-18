import { IAccount, SubmissionType } from '@postybirb/types';

export interface IFormGenerationRequestDto {
  account: IAccount;
  type: SubmissionType;
}

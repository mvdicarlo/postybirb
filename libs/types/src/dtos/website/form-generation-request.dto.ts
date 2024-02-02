import { SubmissionType } from '../../enums';
import { AccountId } from '../../models';

export interface IFormGenerationRequestDto {
  accountId: AccountId;
  type: SubmissionType;
}

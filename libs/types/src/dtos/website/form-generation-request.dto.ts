import { SubmissionType } from '../../enums';
import { AccountId, EntityId } from '../../models';

export interface IFormGenerationRequestDto {
  accountId: AccountId;
  optionId: EntityId;
  type: SubmissionType;
  isMultiSubmission?: boolean;
}

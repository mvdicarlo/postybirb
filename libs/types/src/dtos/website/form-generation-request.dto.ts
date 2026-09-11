import { SubmissionType } from '../../enums';
import { AccountId } from '../../models';

export interface IFormGenerationRequestDto {
  accountId: AccountId;
  type: SubmissionType;
  isMultiSubmission?: boolean;
  fieldValues?: Record<string, string | number | boolean>;
}

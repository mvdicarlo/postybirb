import { SubmissionType } from '../../enums';
import { IAccountDto } from '../account/account.dto';

export interface IFormGenerationRequestDto {
  account: IAccountDto;
  type: SubmissionType;
}

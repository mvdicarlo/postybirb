import { ISubmissionAccountData, ISubmissionFields } from '../../models';
import { IAccountDto } from '../account/account.dto';
import { IEntityDto } from '../database/entity.dto';
import { ISubmissionDto } from './submission.dto';

export type ISubmissionAccountDataDto<
  T extends ISubmissionFields = ISubmissionFields
> = IEntityDto<ISubmissionAccountData<T>> & {
  account?: IAccountDto;
  submission: ISubmissionDto;
};

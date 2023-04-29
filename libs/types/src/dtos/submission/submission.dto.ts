import {
  ISubmission,
  ISubmissionFields,
  ISubmissionMetadata,
} from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { ISubmissionAccountDataDto } from './submission-account-data.dto';
import { ISubmissionFileDto } from './submission-file.dto';

export type ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata
> = IEntityDto<ISubmission<T>> & {
  files: ISubmissionFileDto[];
  options: ISubmissionAccountDataDto<ISubmissionFields>[];
};

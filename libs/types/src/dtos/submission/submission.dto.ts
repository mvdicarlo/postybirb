import {
  ISubmission,
  IWebsiteFormFields,
  ISubmissionMetadata,
} from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { WebsiteOptionsDto } from './website-options.dto';
import { ISubmissionFileDto } from './submission-file.dto';

export type ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata
> = IEntityDto<Omit<ISubmission<T>, 'files' | 'options'>> & {
  files: ISubmissionFileDto[];
  options: WebsiteOptionsDto<IWebsiteFormFields>[];
};

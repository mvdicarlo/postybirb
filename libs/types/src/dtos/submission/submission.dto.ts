import {
  ISubmission,
  ISubmissionMetadata,
  IWebsiteFormFields,
  ValidationResult,
} from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostRecordDto } from '../post/post-record.dto';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';
import { ISubmissionFileDto } from './submission-file.dto';

export type ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata,
> = IEntityDto<Omit<ISubmission<T>, 'files' | 'options' | 'posts'>> & {
  files: ISubmissionFileDto[];
  options: WebsiteOptionsDto<IWebsiteFormFields>[];
  posts: PostRecordDto[];
  validations: ValidationResult[];
};

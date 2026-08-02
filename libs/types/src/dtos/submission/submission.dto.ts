import {
    IPost,
    ISubmission,
    ISubmissionMetadata,
    ValidationResult,
} from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostQueueRecordDto } from '../post/post-queue-record.dto';
import { PostRecordDto } from '../post/post-record.dto';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';
import { ISubmissionFileDto } from './submission-file.dto';

export type ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata,
> = IEntityDto<
  Omit<
    ISubmission<T>,
    'files' | 'options' | 'posts' | 'postRuns' | 'postQueueRecord'
  >
> & {
  files: ISubmissionFileDto[];
  options: WebsiteOptionsDto[];
  posts: PostRecordDto[];
  postRuns: Array<IEntityDto<IPost>>;
  validations: ValidationResult[];
  postQueueRecord?: PostQueueRecordDto;
};

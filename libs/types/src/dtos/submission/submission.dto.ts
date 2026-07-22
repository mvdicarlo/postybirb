import {
    ISubmission,
    ISubmissionMetadata,
    SubmissionId,
    ValidationResult,
} from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostQueueRecordDto } from '../post/post-queue-record.dto';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';
import { ISubmissionFileDto } from './submission-file.dto';

export type ISubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata,
> = IEntityDto<
  Omit<ISubmission<T>, 'files' | 'options' | 'postQueueRecord'>
> & {
  files: ISubmissionFileDto[];
  options: WebsiteOptionsDto[];
  validations: ValidationResult[];
  postQueueRecord?: PostQueueRecordDto;
};

export interface ISubmissionDelta<
  T extends ISubmissionMetadata = ISubmissionMetadata,
> {
  upserts: ISubmissionDto<T>[];
  removals: SubmissionId[];
}

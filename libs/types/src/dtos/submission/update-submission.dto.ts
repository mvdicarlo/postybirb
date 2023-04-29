import {
  ISubmission,
  ISubmissionFields,
  ISubmissionScheduleInfo,
} from '../../models';
import { ISubmissionAccountDataDto } from './submission-account-data.dto';

export type IUpdateSubmissionDto = Pick<
  ISubmission,
  'id' | 'isScheduled' | 'metadata'
> &
  ISubmissionScheduleInfo & {
    deletedAccountDataIds?: string[];
    newOrUpdatedOptions?: ISubmissionAccountDataDto<ISubmissionFields>[];
  };

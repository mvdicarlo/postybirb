import {
  ISubmission,
  IWebsiteFormFields,
  ISubmissionScheduleInfo,
} from '../../models';
import { WebsiteOptionsDto } from './website-options.dto';

export type IUpdateSubmissionDto = Pick<
  ISubmission,
  'id' | 'isScheduled' | 'metadata'
> &
  ISubmissionScheduleInfo & {
    deletedAccountDataIds?: string[];
    newOrUpdatedOptions?: WebsiteOptionsDto<IWebsiteFormFields>[];
  };

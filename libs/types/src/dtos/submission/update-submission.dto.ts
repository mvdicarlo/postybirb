import {
  ISubmission,
  IWebsiteFormFields,
  ISubmissionScheduleInfo,
} from '../../models';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';

export type IUpdateSubmissionDto = Pick<
  ISubmission,
  'isScheduled' | 'metadata'
> &
  ISubmissionScheduleInfo & {
    deletedWebsiteOptions?: string[];
    newOrUpdatedOptions?: WebsiteOptionsDto<IWebsiteFormFields>[];
  };

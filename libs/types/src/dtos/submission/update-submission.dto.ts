import {
  ISubmission,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
} from '../../models';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';

export type IUpdateSubmissionDto = Partial<
  Pick<ISubmission, 'isScheduled' | 'metadata'>
> &
  Partial<ISubmissionScheduleInfo> & {
    deletedWebsiteOptions?: string[];
    newOrUpdatedOptions?: WebsiteOptionsDto<IWebsiteFormFields>[];
  };

import { IWebsiteOptions, IWebsiteFormFields } from '../../models';
import { IAccountDto } from '../account/account.dto';
import { IEntityDto } from '../database/entity.dto';
import { ISubmissionDto } from './submission.dto';

export type WebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> = Omit<IEntityDto<IWebsiteOptions<T>>, 'account' | 'submission'> & {
  account?: IAccountDto;
  submission: ISubmissionDto;
};

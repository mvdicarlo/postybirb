import { AccountId, IWebsiteFormFields, IWebsiteOptions } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { ISubmissionDto } from '../submission/submission.dto';

export type WebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields,
> = Omit<
  IEntityDto<IWebsiteOptions<T>>,
  'account' | 'submission' | 'template'
> & {
  account: AccountId;
  submission: ISubmissionDto;
};

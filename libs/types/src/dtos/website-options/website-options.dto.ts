import { IWebsiteFormFields, IWebsiteOptions } from '../../models';
import { AccountId } from '../../models/account/account.type';
import { IEntityDto } from '../database/entity.dto';
import { ISubmissionDto } from '../submission/submission.dto';

export type WebsiteOptionsDto<
  T extends IWebsiteFormFields = IWebsiteFormFields
> = Omit<IEntityDto<IWebsiteOptions<T>>, 'account' | 'submission'> & {
  account: AccountId;
  submission: ISubmissionDto;
};

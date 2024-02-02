import { AccountId, IUserSpecifiedWebsiteOptions } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type UserSpecifiedWebsiteOptionsDto = Omit<
  IEntityDto<IUserSpecifiedWebsiteOptions>,
  'account'
> & {
  account: AccountId;
};

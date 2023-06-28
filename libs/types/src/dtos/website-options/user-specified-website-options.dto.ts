import { IUserSpecifiedWebsiteOptions } from '../../models';
import { AccountId } from '../../models/account/account.type';
import { IEntityDto } from '../database/entity.dto';

export type UserSpecifiedWebsiteOptionsDto = Omit<
  IEntityDto<IUserSpecifiedWebsiteOptions>,
  'account'
> & {
  account: AccountId;
};

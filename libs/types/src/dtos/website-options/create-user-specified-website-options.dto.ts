import { IUserSpecifiedWebsiteOptions } from '../../models';
import { AccountId } from '../../models/account/account.type';

export type ICreateUserSpecifiedWebsiteOptionsDto = Pick<
  IUserSpecifiedWebsiteOptions,
  'options' | 'type'
> & {
  account: AccountId;
};

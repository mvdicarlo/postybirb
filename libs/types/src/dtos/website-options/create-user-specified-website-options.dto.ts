import { AccountId, IUserSpecifiedWebsiteOptions } from '../../models';

export type ICreateUserSpecifiedWebsiteOptionsDto = Pick<
  IUserSpecifiedWebsiteOptions,
  'options' | 'type'
> & {
  accountId: AccountId;
};

import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { IAccountDto } from '@postybirb/types';
import accountApi from '../api/account.api';
import StoreManager from './store-manager';

export const AccountStore: StoreManager<IAccountDto> =
  new StoreManager<IAccountDto>(ACCOUNT_UPDATES, () =>
    accountApi.getAll().then(({ body }) => body)
  );

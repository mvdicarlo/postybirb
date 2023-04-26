import { IAccountDto } from '@postybirb/dto';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import AccountApi from '../api/account.api';
import StoreManager from './store-manager';

export const AccountStore: StoreManager<IAccountDto> =
  new StoreManager<IAccountDto>(ACCOUNT_UPDATES, () =>
    AccountApi.getAll().then(({ body }) => body)
  );

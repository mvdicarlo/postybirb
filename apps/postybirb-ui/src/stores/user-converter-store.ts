import { USER_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { UserConverterDto } from '@postybirb/types';
import userConvertersApi from '../api/user-converters.api';
import StoreManager from './store-manager';

export const UserConverterStore: StoreManager<UserConverterDto> =
  new StoreManager<UserConverterDto>(USER_CONVERTER_UPDATES, () =>
    userConvertersApi.getAll().then(({ body }) => body),
  );

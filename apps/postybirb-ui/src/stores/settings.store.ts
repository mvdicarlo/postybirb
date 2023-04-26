import { ISettingsDto } from '@postybirb/dto';
import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import SettingsApi from '../api/settings.api';
import StoreManager from './store-manager';

export const SettingsStore: StoreManager<ISettingsDto> =
  new StoreManager<ISettingsDto>(SETTINGS_UPDATES, () =>
    SettingsApi.getAll().then(({ body }) => body)
  );

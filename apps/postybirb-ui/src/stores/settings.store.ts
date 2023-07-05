import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { SettingsDto } from '@postybirb/types';
import SettingsApi from '../api/settings.api';
import StoreManager from './store-manager';

export const SettingsStore: StoreManager<SettingsDto> =
  new StoreManager<SettingsDto>(SETTINGS_UPDATES, () =>
    SettingsApi.getAll().then(({ body }) => body)
  );

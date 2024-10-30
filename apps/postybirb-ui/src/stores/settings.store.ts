import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { SettingsDto } from '@postybirb/types';
import settingsApi from '../api/settings.api';
import StoreManager from './store-manager';

export const SettingsStore: StoreManager<SettingsDto> =
  new StoreManager<SettingsDto>(SETTINGS_UPDATES, () =>
    settingsApi.getAll().then(({ body }) => body),
  );

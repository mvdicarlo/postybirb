import { ISettingsOptions } from './models/settings.interface';

export class SettingsConstants {
  static readonly DEFAULT_PROFILE_NAME = 'default';

  static readonly DEFAULT_SETTINGS: ISettingsOptions = {
    hiddenWebsites: [],
  };
}

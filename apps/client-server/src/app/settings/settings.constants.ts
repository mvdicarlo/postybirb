import { ISettingsOptions } from './models/settings';

export class SettingsConstants {
  static readonly DEFAULT_PROFILE_NAME = 'default';

  static readonly DEFAULT_SETTINGS: ISettingsOptions = {
    hiddenWebsites: [],
  };
}

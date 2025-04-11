import { ISettingsOptions } from './settings-options.interface';

export class SettingsConstants {
  static readonly DEFAULT_PROFILE_NAME = 'default';

  static readonly DEFAULT_SETTINGS: ISettingsOptions = {
    hiddenWebsites: [],
    language: 'en',
    allowAd: true,
    queuePaused: false,
    desktopNotifications: {
      enabled: true,
      showOnPostSuccess: true,
      showOnPostError: true,
      showOnFileWatcherError: true,
      showOnFileWatcherSuccess: true,
    },
  };
}

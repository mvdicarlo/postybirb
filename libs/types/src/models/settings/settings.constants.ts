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
      showOnDirectoryWatcherError: true,
      showOnDirectoryWatcherSuccess: true,
    },
    tagSearchProvider: {
      id: undefined,
      showWikiInHelpOnHover: false,
    },
  };
}

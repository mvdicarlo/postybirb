import { WebsiteId } from '../website/website.type';

/**
 * Setting properties.
 */
export interface ISettingsOptions {
  /**
   * Websites that should not be display in the UI.
   */
  hiddenWebsites: WebsiteId[];

  /**
   * Whether to allow ad for postybirb to be added to the description.
   */
  allowAd: boolean;

  /**
   * Whether the queue is paused by the user.
   */
  queuePaused: boolean;

  /**
   * Desktop notification settings.
   */
  desktopNotifications: DesktopNotificationSettings;

  /**
   * Global tag search provider id
   */
  tagSearchProvider: TagSearchProviderSettings;
}

export type TagSearchProviderSettings = {
  id: string | undefined;
  showWikiInHelpOnHover: boolean;
};

export type DesktopNotificationSettings = {
  enabled: boolean;
  showOnPostSuccess: boolean;
  showOnPostError: boolean;
  showOnDirectoryWatcherError: boolean;
  showOnDirectoryWatcherSuccess: boolean;
};

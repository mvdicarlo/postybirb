import { WebsiteId } from '../website/website.type';

/**
 * Setting properties.
 * @interface
 */
export interface ISettingsOptions {
  /**
   * Websites that should not be display in the UI.
   * @type {string[]}
   */
  hiddenWebsites: WebsiteId[];
  /**
   * Language that is used by i18next
   * @type {string}
   */
  language: string;

  /**
   * Whether to allow ad for postybirb to be added to the description.
   * @type {boolean}
   */
  allowAd: boolean;

  /**
   * Whether the queue is paused by the user.
   * @type {boolean}
   */
  queuePaused: boolean;

  /**
   * Desktop notification settings.
   * @type {DesktopNotificationSettings}
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

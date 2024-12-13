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
}

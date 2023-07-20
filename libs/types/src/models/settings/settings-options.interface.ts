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
}

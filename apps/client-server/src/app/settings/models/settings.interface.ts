/**
 * User settings entity.
 * @interface ISettings
 */
export interface ISettings {
  /**
   * Account profile (on the off change the app supports multiple settings profile in the future)
   * @type {string}
   */
  profile: string;

  /**
   * Settings.
   * @type {ISettingsOptions}
   */
  settings: ISettingsOptions;
}

/**
 * Setting properties.
 * @interface ISettingsOptions
 */
export interface ISettingsOptions {
  hiddenWebsites: string[];
}

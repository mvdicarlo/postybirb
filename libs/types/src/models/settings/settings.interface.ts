import { Select } from '@postybirb/database';
import { IEntity } from '../database/entity.interface';
import { ISettingsOptions } from './settings-options.interface';

/**
 * User settings entity.
 * @interface ISettings
 */
export interface ISettings extends IEntity, Select<'SettingsSchema'> {
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

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ISettings, ISettingsOptions } from '../models/settings.interface';
import { SettingsConstants } from '../settings.constants';

@Entity()
export class Settings implements ISettings {
  /**
   * Id of settings record.
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  profile: string;

  @Column({ nullable: false, type: 'simple-json' })
  settings: ISettingsOptions = SettingsConstants.DEFAULT_SETTINGS;

  constructor(settings?: Partial<ISettings>) {
    if (settings) {
      Object.assign(this, settings);
    }
  }
}

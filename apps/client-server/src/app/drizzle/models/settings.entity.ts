import {
  ISettings,
  ISettingsOptions,
  SettingsConstants,
  SettingsDto,
} from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class Settings extends DatabaseEntity implements ISettings {
  profile: string;

  settings: ISettingsOptions = { ...SettingsConstants.DEFAULT_SETTINGS };

  toObject(): ISettings {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ISettings;
  }

  toDTO(): SettingsDto {
    return this.toObject() as unknown as SettingsDto;
  }
}

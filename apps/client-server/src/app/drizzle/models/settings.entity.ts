import {
  EntityPrimitive,
  ISettings,
  ISettingsOptions,
  SettingsDto,
} from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { SettingsConstants } from '../../settings/settings.constants';
import { DatabaseEntity } from './database-entity';

export class Settings extends DatabaseEntity implements ISettings {
  profile: string;

  settings: ISettingsOptions = { ...SettingsConstants.DEFAULT_SETTINGS };

  toObject(): EntityPrimitive<ISettings> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<ISettings>;
  }

  toDTO(): SettingsDto {
    return this.toObject() as unknown as SettingsDto;
  }
}

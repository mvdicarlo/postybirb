import { ISettings, ISettingsOptions, SettingsDto } from '@postybirb/types';
import { instanceToPlain, plainToClass } from 'class-transformer';
import { SettingsConstants } from '../../settings/settings.constants';
import { settings } from '../schemas';
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

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  static fromDBO(entity: typeof settings.$inferSelect): Settings {
    return plainToClass(Settings, entity, {
      enableCircularCheck: true,
    });
  }
}

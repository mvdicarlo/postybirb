import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import { SETTINGS_REPOSITORY, DATABASE_CONNECTION } from '../../constants';
import { Settings } from '../entities/settings.entity';

// Settings database provider.
export const SettingsProvider: Provider = {
  provide: SETTINGS_REPOSITORY,
  useFactory: (connection: Connection) => connection.getRepository(Settings),
  inject: [DATABASE_CONNECTION],
};

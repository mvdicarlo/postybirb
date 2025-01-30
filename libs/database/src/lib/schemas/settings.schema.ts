import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  ISettingsOptions,
  SettingsConstants,
} from '../../../../types/src/index';
import { CommonSchema } from './common.schema';

export const SettingsSchema = sqliteTable('settings', {
  ...CommonSchema(),
  profile: text()
    .notNull()
    .default(SettingsConstants.DEFAULT_PROFILE_NAME)
    .unique(),
  settings: text({ mode: 'json' })
    .notNull()
    .$type<ISettingsOptions>()
    .default(SettingsConstants.DEFAULT_SETTINGS),
});

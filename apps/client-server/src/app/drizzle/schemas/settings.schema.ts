import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { ISettingsOptions } from '../../../../../../libs/types/src/index';
import { SettingsConstants } from '../../settings/settings.constants';
import { commonSchema } from './common.schema';

export const settings = sqliteTable('settings', {
  ...commonSchema(),
  profile: text()
    .notNull()
    .default(SettingsConstants.DEFAULT_PROFILE_NAME)
    .unique(),
  settings: text({ mode: 'json' })
    .notNull()
    .$type<ISettingsOptions>()
    .default(SettingsConstants.DEFAULT_SETTINGS),
});

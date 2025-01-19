import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { SettingsConstants } from '../../settings/settings.constants';
import { commonSchema } from './common.schema';

export const settings = sqliteTable('settings', {
  ...commonSchema(),
  profile: text()
    .notNull()
    .default(SettingsConstants.DEFAULT_PROFILE_NAME)
    .unique(),
  data: text({ mode: 'json' })
    .notNull()
    .default(JSON.stringify(SettingsConstants.DEFAULT_SETTINGS)),
});

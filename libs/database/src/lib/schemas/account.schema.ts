import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';

export const AccountSchema = sqliteTable('account', {
  ...CommonSchema(),
  groups: text({ mode: 'json' }).notNull().$type<string[]>(),
  name: text().notNull(),
  website: text().notNull(),
});

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';

export const tagConverter = sqliteTable('tag-converter', {
  ...commonSchema(),
  tag: text().notNull().unique(),
  convertTo: text({ mode: 'json' }).notNull().$type<Record<string, string>>(),
});

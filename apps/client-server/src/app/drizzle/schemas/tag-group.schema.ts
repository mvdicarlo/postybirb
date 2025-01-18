import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';

export const tagGroup = sqliteTable('tag-group', {
  ...commonSchema(),
  name: text().notNull().unique(),
  tags: text({ mode: 'json' }).notNull().default('[]'),
});

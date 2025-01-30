import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';

export const TagGroupSchema = sqliteTable('tag-group', {
  ...CommonSchema(),
  name: text().notNull().unique(),
  tags: text({ mode: 'json' }).notNull().$type<string[]>(),
});

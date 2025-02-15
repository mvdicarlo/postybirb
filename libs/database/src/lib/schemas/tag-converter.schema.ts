import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';

export const TagConverterSchema = sqliteTable('tag-converter', {
  ...CommonSchema(),
  convertTo: text({ mode: 'json' }).notNull().$type<Record<string, string>>(),
  tag: text().notNull().unique(),
});

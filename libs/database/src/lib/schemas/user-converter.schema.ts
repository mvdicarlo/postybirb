import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';

export const UserConverterSchema = sqliteTable('user-converter', {
  ...CommonSchema(),
  convertTo: text({ mode: 'json' }).notNull().$type<Record<string, string>>(),
  username: text().notNull().unique(),
});

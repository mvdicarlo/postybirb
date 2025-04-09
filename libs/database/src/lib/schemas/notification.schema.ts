import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';

export const NotificationSchema = sqliteTable('notification', {
  ...CommonSchema(),
  title: text().notNull(),
  message: text().notNull(),
  tags: text({ mode: 'json' }).notNull().$type<string[]>(),
  data: text({ mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  isRead: integer({ mode: 'boolean' }).notNull().default(false),
  hasEmitted: integer({ mode: 'boolean' }).notNull().default(false),
  type: text().notNull(),
});

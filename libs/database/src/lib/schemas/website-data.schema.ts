import { AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';

const commonSchema = CommonSchema();

export const WebsiteDataSchema = sqliteTable('website-data', {
  id: id()
    .primaryKey()
    .unique()
    .notNull()
    .references((): AnySQLiteColumn => AccountSchema.id, {
      onDelete: 'cascade',
    }),
  createdAt: commonSchema.createdAt,
  data: text({ mode: 'json' }).notNull().default({}),
  updatedAt: commonSchema.updatedAt,
});

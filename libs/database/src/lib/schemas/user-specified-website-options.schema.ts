import { AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id, submissionType } from './common.schema';

export const UserSpecifiedWebsiteOptionsSchema = sqliteTable(
  'user-specified-website-options',
  {
    ...CommonSchema(),
    accountId: id()
      .notNull()
      .references((): AnySQLiteColumn => AccountSchema.id, {
        onDelete: 'cascade',
      }),
    options: text({ mode: 'json' }).notNull(),
    ...submissionType(),
  },
);

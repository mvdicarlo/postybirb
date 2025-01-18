import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema, submissionType } from './common.schema';

export const userSpecifiedWebsiteOptions = sqliteTable(
  'user-specified-website-options',
  {
    ...commonSchema(),
    options: text({ mode: 'json' }).notNull().default('{}'),
    ...submissionType(),
    accountId: integer()
      .notNull()
      .references(() => account.id, {
        onDelete: 'cascade',
      }),
  },
);

export const userSpecifiedWebsiteOptionsRelations = relations(
  userSpecifiedWebsiteOptions,
  ({ one }) => ({
    account: one(account, {
      fields: [userSpecifiedWebsiteOptions.accountId],
      references: [account.id],
    }),
  }),
);

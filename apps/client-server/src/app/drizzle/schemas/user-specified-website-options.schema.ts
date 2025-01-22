import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema, id, submissionType } from './common.schema';

export const userSpecifiedWebsiteOptions = sqliteTable(
  'user-specified-website-options',
  {
    ...commonSchema(),
    ...submissionType(),
    options: text({ mode: 'json' }).notNull(),
    ...submissionType(),
    accountId: id()
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

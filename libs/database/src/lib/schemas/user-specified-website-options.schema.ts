import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id, submissionType } from './common.schema';

export const UserSpecifiedWebsiteOptionsSchema = sqliteTable(
  'user-specified-website-options',
  {
    ...CommonSchema(),
    ...submissionType(),
    options: text({ mode: 'json' }).notNull(),
    ...submissionType(),
    accountId: id()
      .notNull()
      .references(() => AccountSchema.id, {
        onDelete: 'cascade',
      }),
  },
);

export const UserSpecifiedWebsiteOptionsRelations = relations(
  UserSpecifiedWebsiteOptionsSchema,
  ({ one }) => ({
    account: one(AccountSchema, {
      fields: [UserSpecifiedWebsiteOptionsSchema.accountId],
      references: [AccountSchema.id],
    }),
  }),
);

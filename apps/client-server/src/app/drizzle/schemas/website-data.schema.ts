import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema, id } from './common.schema';

export const websiteData = sqliteTable('website-data', {
  ...commonSchema(),
  data: text({ mode: 'json' }).notNull().default({}),
  accountId: id()
    .notNull()
    .references(() => account.id, {
      onDelete: 'cascade',
    }),
});

export const websiteDataRelations = relations(websiteData, ({ one }) => ({
  account: one(account, {
    fields: [websiteData.accountId],
    references: [account.id],
  }),
}));

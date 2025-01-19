import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
import { websiteData } from './website-data.schema';
import { websiteOptions } from './website-options.schema';

export const account = sqliteTable('account', {
  ...commonSchema(),
  name: text().notNull(),
  website: text().notNull(),
});

export const accountRelations = relations(account, ({ one, many }) => ({
  websiteOptions: many(websiteOptions),
  websiteData: one(websiteData, {
    fields: [account.id],
    references: [websiteData.accountId],
  }),
}));

import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';

export const WebsiteDataSchema = sqliteTable('website-data', {
  ...CommonSchema(),
  data: text({ mode: 'json' }).notNull().default({}),
  accountId: id()
    .notNull()
    .references(() => AccountSchema.id, {
      onDelete: 'cascade',
    }),
});

export const WebsiteDataRelations = relations(WebsiteDataSchema, ({ one }) => ({
  account: one(AccountSchema, {
    fields: [WebsiteDataSchema.accountId],
    references: [AccountSchema.id],
  }),
}));

import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema } from './common.schema';

export const websiteData = sqliteTable('website-data', {
  ...commonSchema(),
  name: text().notNull(),
  website: text().notNull(),
  data: text({ mode: 'json' }).notNull().default('{}'),
  accountId: integer()
    .notNull()
    .references(() => account.id, {
      onDelete: 'cascade',
    }),
});

export const websiteDataRelations = relations(websiteData, ({ one }) => ({
  account: one(account),
}));

import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema } from './common.schema';
import { submission } from './submission.schema';

export const websiteOptions = sqliteTable('website-options', {
  ...commonSchema(),
  data: text({ mode: 'json' }).notNull().default('{}'),
  accountId: integer()
    .notNull()
    .references(() => account.id, {
      onDelete: 'cascade',
    }),
  submissionId: integer()
    .notNull()
    .references(() => submission.id, {
      onDelete: 'cascade',
    }),
});

export const websiteOptionsRelations = relations(websiteOptions, ({ one }) => ({
  account: one(websiteOptions),
  submission: one(submission),
}));

import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema, id } from './common.schema';
import { submission } from './submission.schema';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { IWebsiteFormFields } from '../../../../../../libs/types/src/index';

export const websiteOptions = sqliteTable('website-options', {
  ...commonSchema(),
  data: text({ mode: 'json' }).notNull().$type<IWebsiteFormFields>(),
  isDefault: integer({ mode: 'boolean' }).notNull(),
  accountId: id()
    .notNull()
    .references(() => account.id, {
      onDelete: 'cascade',
    }),
  submissionId: id()
    .notNull()
    .references(() => submission.id, {
      onDelete: 'cascade',
    }),
});

export const websiteOptionsRelations = relations(websiteOptions, ({ one }) => ({
  account: one(account, {
    fields: [websiteOptions.accountId],
    references: [account.id],
  }),
  submission: one(submission, {
    fields: [websiteOptions.submissionId],
    references: [submission.id],
  }),
}));

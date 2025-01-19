import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { account } from './account.schema';
import { commonSchema } from './common.schema';
import { submission } from './submission.schema';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { IWebsiteFormFields } from '../../../../../../libs/types/src/index';

export const websiteOptions = sqliteTable('website-options', {
  ...commonSchema(),
  data: text({ mode: 'json' }).notNull().$type<IWebsiteFormFields>(),
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
  account: one(account, {
    fields: [websiteOptions.accountId],
    references: [account.id],
  }),
  submission: one(submission, {
    fields: [websiteOptions.submissionId],
    references: [submission.id],
  }),
}));

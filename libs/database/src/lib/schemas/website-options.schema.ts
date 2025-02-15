import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { IWebsiteFormFields } from '../../../../types/src/index';

export const WebsiteOptionsSchema = sqliteTable('website-options', {
  ...CommonSchema(),
  accountId: id()
    .notNull()
    .references(() => AccountSchema.id, {
      onDelete: 'cascade',
    }),
  submissionId: id()
    .notNull()
    .references(() => SubmissionSchema.id, {
      onDelete: 'cascade',
    }),
  data: text({ mode: 'json' }).notNull().$type<IWebsiteFormFields>(),
  isDefault: integer({ mode: 'boolean' }).notNull(),
});

export const WebsiteOptionsRelations = relations(
  WebsiteOptionsSchema,
  ({ one }) => ({
    account: one(AccountSchema, {
      fields: [WebsiteOptionsSchema.accountId],
      references: [AccountSchema.id],
    }),
    submission: one(SubmissionSchema, {
      fields: [WebsiteOptionsSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
  }),
);

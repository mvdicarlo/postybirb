import { relations } from 'drizzle-orm';
import {
  AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { IWebsiteFormFields } from '../../../../types/src/index';

export const WebsiteOptionsSchema = sqliteTable('website-options', {
  ...CommonSchema(),
  accountId: id()
    .notNull()
    .references((): AnySQLiteColumn => AccountSchema.id, {
      onDelete: 'cascade',
    }),
  submissionId: id()
    .notNull()
    .references((): AnySQLiteColumn => SubmissionSchema.id, {
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

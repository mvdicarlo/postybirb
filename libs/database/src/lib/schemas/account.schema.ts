import { relations } from 'drizzle-orm';
import { AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';
import { WebsiteDataSchema } from './website-data.schema';
import { WebsiteOptionsSchema } from './website-options.schema';

export const AccountSchema = sqliteTable('account', {
  ...CommonSchema(),
  groups: text({ mode: 'json' }).notNull().$type<string[]>(),
  name: text().notNull(),
  website: text().notNull(),
  defaultFileTemplateId: id().references(
    (): AnySQLiteColumn => SubmissionSchema.id,
    {
      onDelete: 'set null',
    },
  ),
  defaultMessageTemplateId: id().references(
    (): AnySQLiteColumn => SubmissionSchema.id,
    {
      onDelete: 'set null',
    },
  ),
});

export const AccountRelations = relations(AccountSchema, ({ one, many }) => ({
  websiteOptions: many(WebsiteOptionsSchema),
  websiteData: one(WebsiteDataSchema, {
    fields: [AccountSchema.id],
    references: [WebsiteDataSchema.id],
  }),
}));

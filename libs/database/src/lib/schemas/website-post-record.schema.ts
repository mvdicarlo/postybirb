import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';
import { PostRecordSchema } from './post-record.schema';

export const WebsitePostRecordSchema = sqliteTable('website-post-record', {
  ...CommonSchema(),
  postRecordId: id()
    .notNull()
    .references(() => PostRecordSchema.id, {
      onDelete: 'cascade',
    }),
  accountId: id()
    .notNull()
    .references(() => AccountSchema.id, {
      onDelete: 'set null',
    }),
  completedAt: text(),
  errors: text({ mode: 'json' }).notNull(),
  postData: text({ mode: 'json' }).notNull(),
  metadata: text({ mode: 'json' }).notNull(),
});

export const WebsitepostRecordRelations = relations(
  WebsitePostRecordSchema,
  ({ one }) => ({
    parent: one(PostRecordSchema, {
      fields: [WebsitePostRecordSchema.postRecordId],
      references: [PostRecordSchema.id],
    }),
    account: one(AccountSchema, {
      fields: [WebsitePostRecordSchema.accountId],
      references: [AccountSchema.id],
    }),
  }),
);

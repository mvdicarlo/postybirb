import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  IPostRecordMetadata,
  IPostResponse,
  IWebsiteError,
  WebsitePostRecordData,
} from 'libs/types/src/models';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';
import { PostRecordSchema } from './post-record.schema';

export const WebsitePostRecordSchema = sqliteTable('website-post-record', {
  ...CommonSchema(),
  accountId: id()
    .notNull()
    .references(() => AccountSchema.id, {
      onDelete: 'set null',
    }),
  postRecordId: id()
    .notNull()
    .references(() => PostRecordSchema.id, {
      onDelete: 'cascade',
    }),
  completedAt: text(),
  errors: text({ mode: 'json' }).notNull().$type<IWebsiteError[]>(),
  metadata: text({ mode: 'json' }).notNull().$type<IPostRecordMetadata>(),
  postData: text({ mode: 'json' }).notNull().$type<WebsitePostRecordData>(),
  postResponse: text({ mode: 'json' }).$type<IPostResponse[]>(),
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

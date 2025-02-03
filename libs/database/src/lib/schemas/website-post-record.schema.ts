import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  IPostRecordMetadata,
  IWebsiteError,
  PostData,
} from '../../../../types/src/index';
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
  errors: text().$type<IWebsiteError[]>().default([]),
  postData: text({ mode: 'json' }).$type<PostData>(),
  metadata: text({ mode: 'json' })
    .notNull()
    .$type<IPostRecordMetadata>()
    .default({ sourceMap: {}, postedFiles: [], nextBatchNumber: 1 })
    .$type<IPostRecordMetadata>(),
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

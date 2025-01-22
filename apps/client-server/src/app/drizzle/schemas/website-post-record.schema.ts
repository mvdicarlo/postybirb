import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  IPostRecordMetadata,
  PostData,
} from '../../../../../../libs/types/src/index';
import { account } from './account.schema';
import { commonSchema, id } from './common.schema';
import { postRecord } from './post-record.schema';

export const websitePostRecord = sqliteTable('website-post-record', {
  ...commonSchema(),
  postRecordId: id()
    .notNull()
    .references(() => postRecord.id),
  accountId: id()
    .notNull()
    .references(() => account.id),
  completedAt: text(),
  errors: text().$type<string[]>().default([]),
  postData: text({ mode: 'json' }).$type<PostData>(),
  metadata: text({ mode: 'json' })
    .notNull()
    .$type<IPostRecordMetadata>()
    .default({ sourceMap: {}, postedFiles: [], nextBatchNumber: 1 })
    .$type<IPostRecordMetadata>(),
});

export const websitepostRecordRelations = relations(
  websitePostRecord,
  ({ one }) => ({
    parent: one(postRecord, {
      fields: [websitePostRecord.postRecordId],
      references: [postRecord.id],
    }),
    account: one(account, {
      fields: [websitePostRecord.accountId],
      references: [account.id],
    }),
  }),
);

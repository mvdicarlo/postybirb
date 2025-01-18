import { relations } from 'drizzle-orm';
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
import { postRecord } from './post-record.schema';
import { submission } from './submission.schema';

export const postQueueRecord = sqliteTable('post-queue', {
  ...commonSchema(),
  postRecordId: integer()
    .notNull()
    .references(() => postRecord.id),
  submissionId: integer()
    .notNull()
    .references(() => submission.id),
});

export const postQueueRecordRelations = relations(
  postQueueRecord,
  ({ one }) => ({
    submission: one(submission, {
      fields: [postQueueRecord.submissionId],
      references: [submission.id],
    }),
    postRecord: one(postRecord, {
      fields: [postQueueRecord.postRecordId],
      references: [postRecord.id],
    }),
  }),
);

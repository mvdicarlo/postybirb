import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  PostRecordResumeMode,
  PostRecordState,
} from '../../../../../../libs/types/src/index';
import { commonSchema, id } from './common.schema';
import { postQueueRecord } from './post-queue-record.schema';
import { submission } from './submission.schema';
import { websitePostRecord } from './website-post-record.schema';

export const postRecord = sqliteTable('post-record', {
  ...commonSchema(),
  state: text({
    enum: [
      PostRecordState.DONE,
      PostRecordState.FAILED,
      PostRecordState.PENDING,
      PostRecordState.RUNNING,
    ],
  })
    .notNull()
    .default(PostRecordState.PENDING),
  resumeMode: text({
    enum: [
      PostRecordResumeMode.CONTINUE,
      PostRecordResumeMode.RESTART,
      PostRecordResumeMode.CONTINUE_RETRY,
    ],
  })
    .notNull()
    .default(PostRecordResumeMode.CONTINUE),
  submissionId: id().references(() => submission.id),
  postQueueRecordId: id().references(() => postQueueRecord.id),
  completedAt: text(),
});

export const postRecordRelations = relations(postRecord, ({ one, many }) => ({
  parent: one(submission, {
    fields: [postRecord.submissionId],
    references: [submission.id],
  }),
  postQueueRecord: one(postQueueRecord, {
    fields: [postRecord.postQueueRecordId],
    references: [postQueueRecord.id],
  }),
  children: many(websitePostRecord),
}));

import { PostRecordResumeMode, PostRecordState } from '@postybirb/types';
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
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
  submissionId: integer()
    .notNull()
    .references(() => submission.id),
  completedAt: text(),
});

export const postRecordRelations = relations(postRecord, ({ one, many }) => ({
  parent: one(submission, {
    fields: [postRecord.submissionId],
    references: [submission.id],
  }),
  postQueueRecord: one(postQueueRecord),
  children: many(websitePostRecord),
}));

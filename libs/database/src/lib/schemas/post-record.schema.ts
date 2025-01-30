import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  PostRecordResumeMode,
  PostRecordState,
} from '../../../../types/src/index';
import { CommonSchema, id } from './common.schema';
import { PostQueueRecordSchema } from './post-queue-record.schema';
import { SubmissionSchema } from './submission.schema';
import { WebsitePostRecordSchema } from './website-post-record.schema';

export const PostRecordSchema = sqliteTable('post-record', {
  ...CommonSchema(),
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
  submissionId: id().references(() => SubmissionSchema.id),
  postQueueRecordId: id().references(() => PostQueueRecordSchema.id),
  completedAt: text(),
});

export const PostRecordRelations = relations(
  PostRecordSchema,
  ({ one, many }) => ({
    parent: one(SubmissionSchema, {
      fields: [PostRecordSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    postQueueRecord: one(PostQueueRecordSchema, {
      fields: [PostRecordSchema.postQueueRecordId],
      references: [PostQueueRecordSchema.id],
    }),
    children: many(WebsitePostRecordSchema),
  }),
);

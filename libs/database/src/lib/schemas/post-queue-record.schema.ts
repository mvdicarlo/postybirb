import { relations } from 'drizzle-orm';
import { AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PostRecordResumeMode } from '../../../../types/src/index';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';

export const PostQueueRecordSchema = sqliteTable('post-queue', {
  ...CommonSchema(),
  submissionId: id()
    .notNull()
    .references((): AnySQLiteColumn => SubmissionSchema.id, {
      onDelete: 'cascade',
    }),

  /** Null when the user was not asked, leaving the engine default. */
  resumeMode: text({
    enum: [
      PostRecordResumeMode.CONTINUE,
      PostRecordResumeMode.NEW,
      PostRecordResumeMode.CONTINUE_RETRY,
    ],
  }),
});

export const PostQueueRecordRelations = relations(
  PostQueueRecordSchema,
  ({ one }) => ({
    submission: one(SubmissionSchema, {
      fields: [PostQueueRecordSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
  }),
);

import { PostRecordResumeMode, PostRecordState } from '@postybirb/types';
import { AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';

export const PostRecordSchema = sqliteTable('post-record', {
  ...CommonSchema(),
  version: text(),

  submissionId: id().references((): AnySQLiteColumn => SubmissionSchema.id, {
    onDelete: 'cascade',
  }),

  /**
   * Reference to the originating NEW PostRecord for this chain.
   * - null for NEW records (they ARE the origin)
   * - Set to the origin's ID for CONTINUE/RETRY records
   * Used to group related posting attempts together.
   */
  originPostRecordId: id().references(
    (): AnySQLiteColumn => PostRecordSchema.id,
    {
      onDelete: 'set null',
    },
  ),

  completedAt: text(),
  resumeMode: text({
    enum: [
      PostRecordResumeMode.CONTINUE,
      PostRecordResumeMode.NEW,
      PostRecordResumeMode.CONTINUE_RETRY,
    ],
  })
    .notNull()
    .default(PostRecordResumeMode.CONTINUE),
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
});

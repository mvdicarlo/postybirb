import { relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  PostRecordResumeMode,
  PostRecordState,
} from '../../../../types/src/index';
import { CommonSchema, id } from './common.schema';
import { PostEventSchema } from './post-event.schema';
import { SubmissionSchema } from './submission.schema';

export const PostRecordSchema = sqliteTable('post-record', {
  ...CommonSchema(),
  submissionId: id().references(() => SubmissionSchema.id, {
    onDelete: 'cascade',
  }),

  /**
   * Reference to the originating NEW PostRecord for this chain.
   * - null for NEW records (they ARE the origin)
   * - Set to the origin's ID for CONTINUE/RETRY records
   * Used to group related posting attempts together.
   */
  originPostRecordId: id().references(() => PostRecordSchema.id, {
    onDelete: 'set null',
  }),

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

export const PostRecordRelations = relations(
  PostRecordSchema,
  ({ one, many }) => ({
    submission: one(SubmissionSchema, {
      fields: [PostRecordSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    events: many(PostEventSchema),
    /** The originating NEW PostRecord for this chain (null if this IS the origin) */
    origin: one(PostRecordSchema, {
      fields: [PostRecordSchema.originPostRecordId],
      references: [PostRecordSchema.id],
      relationName: 'originChain',
    }),
    /** All CONTINUE/RETRY PostRecords that chain to this origin */
    chainedRecords: many(PostRecordSchema, {
      relationName: 'originChain',
    }),
  }),
);

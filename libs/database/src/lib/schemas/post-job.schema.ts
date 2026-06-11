import { relations } from 'drizzle-orm';
import {
    AnySQLiteColumn,
    index,
    real,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
    NodeStatus,
    PostRecordResumeMode,
} from '../../../../types/src/index';
import { CommonSchema, id } from './common.schema';
import { PostTaskSchema } from './post-task.schema';
import { SubmissionSchema } from './submission.schema';

/**
 * A PostJob is one posting attempt for a submission — the root of a job tree
 * (job → tasks → units). The tree is the persisted state; resume re-runs any
 * node not in a terminal-done status.
 */
export const PostJobSchema = sqliteTable(
  'post-job',
  {
    ...CommonSchema(),
    version: text(),

    submissionId: id()
      .notNull()
      .references((): AnySQLiteColumn => SubmissionSchema.id, {
        onDelete: 'cascade',
      }),

    /**
     * The job this one is a retry/continuation of (null if it is the origin).
     * Replaces the legacy originPostRecordId chain.
     */
    attemptOf: id().references((): AnySQLiteColumn => PostJobSchema.id, {
      onDelete: 'set null',
    }),

    status: text({
      enum: [
        NodeStatus.QUEUED,
        NodeStatus.READY,
        NodeStatus.RUNNING,
        NodeStatus.WAITING,
        NodeStatus.SUCCEEDED,
        NodeStatus.FAILED,
        NodeStatus.SKIPPED,
        NodeStatus.CANCELLED,
      ],
    })
      .notNull()
      .default(NodeStatus.QUEUED),

    resumeMode: text({
      enum: [
        PostRecordResumeMode.CONTINUE,
        PostRecordResumeMode.NEW,
        PostRecordResumeMode.CONTINUE_RETRY,
      ],
    })
      .notNull()
      .default(PostRecordResumeMode.NEW),

    priority: real().notNull().default(0),
    scheduledFor: text(),
    completedAt: text(),
  },
  (table) => [
    index('idx_post_job_submission').on(table.submissionId, table.status),
    index('idx_post_job_status').on(table.status),
  ],
);

export const PostJobRelations = relations(PostJobSchema, ({ one, many }) => ({
  submission: one(SubmissionSchema, {
    fields: [PostJobSchema.submissionId],
    references: [SubmissionSchema.id],
  }),
  origin: one(PostJobSchema, {
    fields: [PostJobSchema.attemptOf],
    references: [PostJobSchema.id],
    relationName: 'attemptChain',
  }),
  attempts: many(PostJobSchema, { relationName: 'attemptChain' }),
  tasks: many(PostTaskSchema),
}));

import { relations } from 'drizzle-orm';
import {
    AnySQLiteColumn,
    index,
    integer,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
    ITaskError,
    NodeStatus,
    SubmissionFileId,
    UnitKind,
} from '../../../../types/src/index';
import { CommonSchema, id } from './common.schema';
import { PostTaskSchema } from './post-task.schema';

/**
 * A PostUnit is an atomic dispatch unit within a task:
 *  - a BATCH of files (sized by the website's fileBatchSize), or
 *  - a single MESSAGE.
 * Each unit is independently resumable.
 */
export const PostUnitSchema = sqliteTable(
  'post-unit',
  {
    ...CommonSchema(),

    taskId: id()
      .notNull()
      .references((): AnySQLiteColumn => PostTaskSchema.id, {
        onDelete: 'cascade',
      }),

    kind: text({ enum: [UnitKind.BATCH, UnitKind.MESSAGE] }).notNull(),

    ordinal: integer().notNull().default(0),

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

    /** File ids in this batch (empty for MESSAGE units). */
    fileIds: text({ mode: 'json' }).$type<SubmissionFileId[]>().notNull().default([]),

    sourceUrl: text(),
    error: text({ mode: 'json' }).$type<ITaskError>(),
  },
  (table) => [index('idx_post_unit_task').on(table.taskId)],
);

export const PostUnitRelations = relations(PostUnitSchema, ({ one }) => ({
  task: one(PostTaskSchema, {
    fields: [PostUnitSchema.taskId],
    references: [PostTaskSchema.id],
  }),
}));

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
    Dependency,
    IPostAccountSnapshot,
    ITaskError,
    NodeStatus,
} from '../../../../types/src/index';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';
import { PostJobSchema } from './post-job.schema';
import { PostUnitSchema } from './post-unit.schema';

/**
 * A PostTask is one posting destination within a job: a single account on a
 * single website. It owns the units that actually dispatch and carries the
 * source-URL dependency gate, retry counters and the resulting source URL.
 */
export const PostTaskSchema = sqliteTable(
  'post-task',
  {
    ...CommonSchema(),

    jobId: id()
      .notNull()
      .references((): AnySQLiteColumn => PostJobSchema.id, {
        onDelete: 'cascade',
      }),

    // Null if the account was deleted after posting; accountSnapshot preserves
    // display info for history.
    accountId: id().references((): AnySQLiteColumn => AccountSchema.id, {
      onDelete: 'set null',
    }),

    websiteId: text().notNull(),

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

    /** Source-URL dependency gate ({mode, tasks, n?}); null = runs immediately. */
    dependency: text({ mode: 'json' }).$type<Dependency>(),

    attempts: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(3),

    sourceUrl: text(),
    message: text(),
    error: text({ mode: 'json' }).$type<ITaskError>(),

    /** Epoch ms until which this task is parked (rate-limit/dependency). */
    waitingUntil: integer(),

    /** Account snapshot captured at posting time (survives account deletion). */
    accountSnapshot: text({ mode: 'json' }).$type<IPostAccountSnapshot>(),
  },
  (table) => [
    index('idx_post_task_job').on(table.jobId, table.status),
    index('idx_post_task_account').on(table.jobId, table.accountId),
  ],
);

export const PostTaskRelations = relations(PostTaskSchema, ({ one, many }) => ({
  job: one(PostJobSchema, {
    fields: [PostTaskSchema.jobId],
    references: [PostJobSchema.id],
  }),
  account: one(AccountSchema, {
    fields: [PostTaskSchema.accountId],
    references: [AccountSchema.id],
  }),
  units: many(PostUnitSchema),
}));

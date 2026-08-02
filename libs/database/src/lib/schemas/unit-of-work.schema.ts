import { relations } from 'drizzle-orm';
import {
    AnySQLiteColumn,
    integer,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { UnitOfWorkState } from '../../../../types/src/index';
import { AccountSchema } from './account.schema';
import { CommonSchema, id } from './common.schema';
import { PostSchema } from './post.schema';
import { SubmissionFileSchema } from './submission-file.schema';
import { SubmissionSchema } from './submission.schema';

export const UnitOfWorkSchema = sqliteTable(
  'unit-of-work',
  {
    ...CommonSchema(),
    postId: id()
      .notNull()
      .references((): AnySQLiteColumn => PostSchema.id, {
        onDelete: 'cascade',
      }),
    submissionId: id()
      .notNull()
      .references((): AnySQLiteColumn => SubmissionSchema.id, {
        onDelete: 'cascade',
      }),
    accountId: id()
      .notNull()
      .references((): AnySQLiteColumn => AccountSchema.id, {
        onDelete: 'cascade',
      }),
    fileId: id().references(
      (): AnySQLiteColumn => SubmissionFileSchema.id,
      { onDelete: 'set null' },
    ),
    fileHash: text(),
    attempt: integer().notNull().default(0),
    data: text({ mode: 'json' }).$type<Record<string, unknown>>(),
    response: text({ mode: 'json' }).$type<Record<string, unknown>>(),
    evicted: integer({ mode: 'boolean' }).notNull().default(false),
    url: text(),
    batch: text(),
    state: text({
      enum: [
        UnitOfWorkState.NEW,
        UnitOfWorkState.PENDING,
        UnitOfWorkState.EXECUTING,
        UnitOfWorkState.SUCCEEDED,
        UnitOfWorkState.FAILED,
        UnitOfWorkState.CANCELLED,
        UnitOfWorkState.RATE_LIMITED,
      ],
    })
      .notNull()
      .default(UnitOfWorkState.NEW),
  },
);

export const UnitOfWorkRelations = relations(
  UnitOfWorkSchema,
  ({ one }) => ({
    post: one(PostSchema, {
      fields: [UnitOfWorkSchema.postId],
      references: [PostSchema.id],
    }),
    submission: one(SubmissionSchema, {
      fields: [UnitOfWorkSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    account: one(AccountSchema, {
      fields: [UnitOfWorkSchema.accountId],
      references: [AccountSchema.id],
    }),
    file: one(SubmissionFileSchema, {
      fields: [UnitOfWorkSchema.fileId],
      references: [SubmissionFileSchema.id],
    }),
  }),
);
import { relations } from 'drizzle-orm';
import { AnySQLiteColumn, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';
import { UnitOfWorkSchema } from './unit-of-work.schema';

export const PostSchema = sqliteTable('post', {
  ...CommonSchema(),
  submissionId: id()
    .notNull()
    .references((): AnySQLiteColumn => SubmissionSchema.id, {
      onDelete: 'cascade',
    }),
  completed: integer({ mode: 'boolean' }).notNull().default(false),
  cancelled: integer({ mode: 'boolean' }).notNull().default(false),
});

export const PostRelations = relations(PostSchema, ({ one, many }) => ({
  submission: one(SubmissionSchema, {
    fields: [PostSchema.submissionId],
    references: [SubmissionSchema.id],
  }),
  unitsOfWork: many(UnitOfWorkSchema),
}));
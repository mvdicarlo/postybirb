import { relations } from 'drizzle-orm';
import { AnySQLiteColumn, sqliteTable } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';

export const PostQueueRecordSchema = sqliteTable('post-queue', {
  ...CommonSchema(),
  submissionId: id()
    .notNull()
    .references((): AnySQLiteColumn => SubmissionSchema.id, {
      onDelete: 'cascade',
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

import { relations } from 'drizzle-orm';
import { AnySQLiteColumn, sqliteTable } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { PostRecordSchema } from './post-record.schema';
import { SubmissionSchema } from './submission.schema';

export const PostQueueRecordSchema = sqliteTable('post-queue', {
  ...CommonSchema(),
  postRecordId: id().references((): AnySQLiteColumn => PostRecordSchema.id, {
    onDelete: 'set null',
  }),
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
    postRecord: one(PostRecordSchema, {
      fields: [PostQueueRecordSchema.postRecordId],
      references: [PostRecordSchema.id],
    }),
  }),
);

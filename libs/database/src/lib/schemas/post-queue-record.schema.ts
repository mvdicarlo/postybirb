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

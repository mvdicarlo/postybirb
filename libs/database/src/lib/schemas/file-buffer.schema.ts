import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { SubmissionFileSchema } from './submission-file.schema';

export const FileBufferSchema = sqliteTable('file-buffer', {
  ...CommonSchema(),
  submissionFileId: id()
    .notNull()
    .references(() => SubmissionFileSchema.id, {
      onDelete: 'cascade',
    }),
  buffer: blob({ mode: 'buffer' }).notNull(),
  fileName: text().notNull(),
  height: integer().notNull(),
  mimeType: text().notNull(),
  size: integer().notNull(),
  width: integer().notNull(),
});

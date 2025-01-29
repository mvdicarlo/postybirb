import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema, id } from './common.schema';
import { submissionFile } from './submission-file.schema';

export const fileBuffer = sqliteTable('file-buffer', {
  ...commonSchema(),
  submissionFileId: id()
    .notNull()
    .references(() => submissionFile.id, {
      onDelete: 'cascade',
    }),
  buffer: blob({ mode: 'buffer' }).notNull(),
  fileName: text().notNull(),
  mimeType: text().notNull(),
  size: integer().notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
});

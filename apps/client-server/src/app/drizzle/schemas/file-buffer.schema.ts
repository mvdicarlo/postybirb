import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
import { submissionFile } from './submission-file.schema';

export const fileBuffer = sqliteTable('file-buffer', {
  ...commonSchema(),
  submissionFileId: integer()
    .notNull()
    .references(() => submissionFile.id, {
      onDelete: 'cascade',
    }),
  buffer: blob({ mode: 'buffer' }).notNull(),
  fileName: text().notNull(),
  mimeType: text().notNull(),
  size: integer().notNull().default(0),
  width: integer().notNull().default(0),
  height: integer().notNull().default(0),
});

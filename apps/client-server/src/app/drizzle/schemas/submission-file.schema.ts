import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
import { fileBuffer } from './file-buffer.schema';
import { submission } from './submission.schema';

export const submissionFile = sqliteTable('submission-file', {
  ...commonSchema(),
  submissionId: integer()
    .notNull()
    .references(() => submission.id),
  fileName: text().notNull(),
  hash: text().notNull(),
  size: integer().notNull(),
  mimeType: text().notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  hasThumbnail: integer({ mode: 'boolean' }).notNull(),
  hasAltFile: integer({ mode: 'boolean' }).notNull().default(false),
  hasCustomThumbnail: integer({ mode: 'boolean' }).notNull().default(false),
  primaryFileId: integer().references(() => fileBuffer.id),
  thumbnailId: integer().references(() => fileBuffer.id),
  altFileId: integer().references(() => fileBuffer.id),
});

export const submissionFileRelations = relations(submissionFile, ({ one }) => ({
  submission: one(submission, {
    fields: [submissionFile.submissionId],
    references: [submission.id],
  }),
  primaryFile: one(fileBuffer, {
    fields: [submissionFile.primaryFileId],
    references: [fileBuffer.id],
  }),
  thumbnail: one(fileBuffer, {
    fields: [submissionFile.thumbnailId],
    references: [fileBuffer.id],
  }),
  altFile: one(fileBuffer, {
    fields: [submissionFile.altFileId],
    references: [fileBuffer.id],
  }),
}));

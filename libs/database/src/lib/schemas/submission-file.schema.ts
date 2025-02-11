import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { FileBufferSchema } from './file-buffer.schema';
import { SubmissionSchema } from './submission.schema';

export const SubmissionFileSchema = sqliteTable('submission-file', {
  ...CommonSchema(),
  fileName: text().notNull(),
  hash: text().notNull(),
  size: integer().notNull(),
  mimeType: text().notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  hasThumbnail: integer({ mode: 'boolean' }).notNull(),
  hasAltFile: integer({ mode: 'boolean' }).notNull().default(false),
  hasCustomThumbnail: integer({ mode: 'boolean' }).notNull().default(false),
  submissionId: id()
    .notNull()
    .references(() => SubmissionSchema.id, {
      onDelete: 'cascade',
    }),
  primaryFileId: id().references(() => FileBufferSchema.id),
  thumbnailId: id().references(() => FileBufferSchema.id),
  altFileId: id().references(() => FileBufferSchema.id),
});

export const SubmissionFileRelations = relations(
  SubmissionFileSchema,
  ({ one }) => ({
    submission: one(SubmissionSchema, {
      fields: [SubmissionFileSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    file: one(FileBufferSchema, {
      fields: [SubmissionFileSchema.primaryFileId],
      references: [FileBufferSchema.id],
    }),
    thumbnail: one(FileBufferSchema, {
      fields: [SubmissionFileSchema.thumbnailId],
      references: [FileBufferSchema.id],
    }),
    altFile: one(FileBufferSchema, {
      fields: [SubmissionFileSchema.altFileId],
      references: [FileBufferSchema.id],
    }),
  }),
);

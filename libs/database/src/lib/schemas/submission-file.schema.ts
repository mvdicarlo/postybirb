import {
  AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { CommonSchema, id } from './common.schema';
import { FileBufferSchema } from './file-buffer.schema';
import { SubmissionSchema } from './submission.schema';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { SubmissionFileMetadata } from '../../../../types/src/index';

export const SubmissionFileSchema = sqliteTable('submission-file', {
  ...CommonSchema(),
  submissionId: id()
    .notNull()
    .references((): AnySQLiteColumn => SubmissionSchema.id, {
      onDelete: 'cascade',
    }),
  primaryFileId: id().references((): AnySQLiteColumn => FileBufferSchema.id),
  thumbnailId: id().references((): AnySQLiteColumn => FileBufferSchema.id),
  altFileId: id().references((): AnySQLiteColumn => FileBufferSchema.id),
  fileName: text().notNull(),
  hasAltFile: integer({ mode: 'boolean' }).notNull().default(false),
  hasCustomThumbnail: integer({ mode: 'boolean' }).notNull().default(false),
  hasThumbnail: integer({ mode: 'boolean' }).notNull(),
  hash: text().notNull(),
  height: integer().notNull(),
  mimeType: text().notNull(),
  size: integer().notNull(),
  width: integer().notNull(),
  metadata: text({ mode: 'json' })
    .notNull()
    .$type<SubmissionFileMetadata>()
    .default({} as SubmissionFileMetadata),
  order: integer().default(Number.MAX_SAFE_INTEGER).notNull(),
});

import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
} from '../../../../types/src/index';
import { CommonSchema, submissionType } from './common.schema';
import { PostQueueRecordSchema } from './post-queue-record.schema';
import { PostRecordSchema } from './post-record.schema';
import { SubmissionFileSchema } from './submission-file.schema';
import { WebsiteOptionsSchema } from './website-options.schema';

export const SubmissionSchema = sqliteTable('submission', {
  ...CommonSchema(),
  ...submissionType(),
  isScheduled: integer({ mode: 'boolean' }).notNull(),
  isTemplate: integer({ mode: 'boolean' }).notNull(),
  isMultiSubmission: integer({ mode: 'boolean' }).notNull(),
  isArchived: integer({ mode: 'boolean' }).default(false),
  schedule: text({ mode: 'json' }).notNull().$type<ISubmissionScheduleInfo>(),
  metadata: text({ mode: 'json' }).notNull().$type<ISubmissionMetadata>(),
  order: integer().notNull(),
});

export const SubmissionRelations = relations(
  SubmissionSchema,
  ({ one, many }) => ({
    options: many(WebsiteOptionsSchema),
    posts: many(PostRecordSchema),
    files: many(SubmissionFileSchema),
    postQueueRecord: one(PostQueueRecordSchema),
  }),
);

import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
} from '../../../../../../libs/types/src/index';
import { commonSchema, submissionType } from './common.schema';
import { postQueueRecord } from './post-queue-record.schema';
import { postRecord } from './post-record.schema';
import { submissionFile } from './submission-file.schema';
import { websiteOptions } from './website-options.schema';

export const submission = sqliteTable('submission', {
  ...commonSchema(),
  ...submissionType(),
  isScheduled: integer({ mode: 'boolean' }).notNull(),
  isTemplate: integer({ mode: 'boolean' }).notNull(),
  isMultiSubmission: integer({ mode: 'boolean' }).notNull(),
  schedule: text({ mode: 'json' }).notNull().$type<ISubmissionScheduleInfo>(),
  metadata: text({ mode: 'json' }).notNull().$type<ISubmissionMetadata>(),
  order: integer().notNull(),
});

export const submissionRelations = relations(submission, ({ many }) => ({
  options: many(websiteOptions),
  posts: many(postRecord),
  files: many(submissionFile),
  postQueueRecord: many(postQueueRecord),
}));

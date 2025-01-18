import { ISubmissionScheduleInfo } from '@postybirb/types';
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema, submissionType } from './common.schema';
import { postRecord } from './post-record.schema';
import { submissionFile } from './submission-file.schema';
import { websiteOptions } from './website-options.schema';

export const submission = sqliteTable('submission', {
  ...commonSchema(),
  ...submissionType(),
  isScheduled: integer({ mode: 'boolean' }).default(false),
  isTemplate: integer({ mode: 'boolean' }).default(false),
  schedule: text({ mode: 'json' }).$type<ISubmissionScheduleInfo>(),
  metadata: text({ mode: 'json' }).notNull().default('{}'),
  order: integer().notNull(),
});

export const submissionRelations = relations(submission, ({ many }) => ({
  options: many(websiteOptions),
  posts: many(postRecord),
  files: many(submissionFile),
}));

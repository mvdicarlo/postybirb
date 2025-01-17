import { ISubmissionScheduleInfo, SubmissionType } from '@postybirb/types';
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
import { websiteOptions } from './website-options.schema';

export const submission = sqliteTable('submission', {
  ...commonSchema(),
  submissionType: text({
    enum: [SubmissionType.FILE, SubmissionType.MESSAGE],
  }).notNull(),
  isScheduled: integer({ mode: 'boolean' }).default(false),
  isTemplate: integer({ mode: 'boolean' }).default(false),
  schedule: text({ mode: 'json' }).$type<ISubmissionScheduleInfo>(),
  metadata: text({ mode: 'json' }).notNull().default('{}'),
  order: integer().notNull(),
});

export const submissionRelations = relations(submission, ({ many }) => ({
  options: many(websiteOptions),
}));

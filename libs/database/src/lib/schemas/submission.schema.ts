import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
} from '../../../../types/src/index';
import { CommonSchema, submissionType } from './common.schema';

export const SubmissionSchema = sqliteTable('submission', {
  ...CommonSchema(),
  ...submissionType(),
  isArchived: integer({ mode: 'boolean' }).default(false),
  isInitialized: integer({ mode: 'boolean' }).default(false),
  isMultiSubmission: integer({ mode: 'boolean' }).notNull(),
  isScheduled: integer({ mode: 'boolean' }).notNull(),
  isTemplate: integer({ mode: 'boolean' }).notNull(),
  metadata: text({ mode: 'json' }).notNull().$type<ISubmissionMetadata>(),
  order: real().notNull(),
  schedule: text({ mode: 'json' }).notNull().$type<ISubmissionScheduleInfo>(),
});

import { relations } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v4 } from 'uuid';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  IPostEventError,
  IPostEventMetadata,
  PostEventType,
} from '../../../../types/src/index';
import { AccountSchema } from './account.schema';
import { id } from './common.schema';
import { PostRecordSchema } from './post-record.schema';

/**
 * Post Event schema - immutable ledger of posting actions.
 * Each posting action creates one or more events that are never mutated.
 */
export const PostEventSchema = sqliteTable(
  'post-event',
  {
    id: id()
      .primaryKey()
      .unique()
      .notNull()
      .$default(() => v4()),
    createdAt: text()
      .notNull()
      .$default(() => new Date().toISOString()),

    // Parent reference
    postRecordId: id()
      .notNull()
      .references(() => PostRecordSchema.id, { onDelete: 'cascade' }),

    // Account this event relates to
    accountId: id().references(() => AccountSchema.id, {
      onDelete: 'set null',
    }),

    // Event classification
    eventType: text({
      enum: [
        PostEventType.POST_ATTEMPT_STARTED,
        PostEventType.POST_ATTEMPT_COMPLETED,
        PostEventType.POST_ATTEMPT_FAILED,
        PostEventType.FILE_POSTED,
        PostEventType.FILE_FAILED,
        PostEventType.MESSAGE_POSTED,
        PostEventType.MESSAGE_FAILED,
      ],
    }).notNull(),

    // File reference (null for message submissions and lifecycle events)
    fileId: id(),

    // Success outcome
    sourceUrl: text(),

    // Failure outcome
    error: text({ mode: 'json' }).$type<IPostEventError>(),

    // Flexible metadata with snapshots
    metadata: text({ mode: 'json' }).$type<IPostEventMetadata>(),
  },
  (table) => [
    // Composite index for queries by postRecordId + eventType (most common pattern)
    index('idx_post_event_type').on(table.postRecordId, table.eventType),
    // Composite index for queries that also filter by accountId
    index('idx_post_event_account').on(
      table.postRecordId,
      table.accountId,
      table.eventType,
    ),
  ],
);

export const PostEventRelations = relations(PostEventSchema, ({ one }) => ({
  postRecord: one(PostRecordSchema, {
    fields: [PostEventSchema.postRecordId],
    references: [PostRecordSchema.id],
  }),
  account: one(AccountSchema, {
    fields: [PostEventSchema.accountId],
    references: [AccountSchema.id],
  }),
}));

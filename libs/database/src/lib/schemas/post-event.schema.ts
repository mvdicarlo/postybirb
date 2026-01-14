import { relations } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
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
      .$default(() => crypto.randomUUID()),
    createdAt: text()
      .notNull()
      .$default(() => new Date().toISOString()),

    // Parent reference
    postRecordId: id()
      .notNull()
      .references(() => PostRecordSchema.id, { onDelete: 'cascade' }),

    // Account this event relates to
    accountId: id().references(() => AccountSchema.id, { onDelete: 'set null' }),

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
    // Composite index for resume queries: "what events exist for this record + account?"
    index('idx_post_event_lookup').on(
      table.postRecordId,
      table.accountId,
      table.eventType
    ),
    // Index for cross-website source URL lookups by file
    index('idx_post_event_file').on(table.postRecordId, table.fileId),
  ]
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

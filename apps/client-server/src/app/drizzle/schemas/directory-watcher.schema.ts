import { DirectoryWatcherImportAction } from '@postybirb/types';
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { commonSchema } from './common.schema';
import { submission } from './submission.schema';

export const directoryWatcher = sqliteTable('directory-watcher', {
  ...commonSchema(),
  path: text().notNull(),
  importActions: text({
    enum: [DirectoryWatcherImportAction.NEW_SUBMISSION],
  })
    .notNull()
    .default(DirectoryWatcherImportAction.NEW_SUBMISSION),
  templateId: integer()
    .notNull()
    .references(() => submission.id, {
      onDelete: 'cascade',
    }),
});

export const directoryWatcherRelations = relations(
  directoryWatcher,
  ({ one }) => ({
    template: one(submission, {
      fields: [directoryWatcher.templateId],
      references: [submission.id],
    }),
  }),
);

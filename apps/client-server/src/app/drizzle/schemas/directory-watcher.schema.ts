import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { DirectoryWatcherImportAction } from '../../../../../../libs/types/src/index';
import { commonSchema } from './common.schema';
import { submission } from './submission.schema';

export const directoryWatcher = sqliteTable('directory-watcher', {
  ...commonSchema(),
  path: text(),
  importActions: text({
    enum: [DirectoryWatcherImportAction.NEW_SUBMISSION],
  })
    .notNull()
    .default(DirectoryWatcherImportAction.NEW_SUBMISSION),
  templateId: integer().references(() => submission.id),
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

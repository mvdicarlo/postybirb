import { AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { DirectoryWatcherImportAction } from '../../../../types/src/index';
import { CommonSchema, id } from './common.schema';
import { SubmissionSchema } from './submission.schema';

export const DirectoryWatcherSchema = sqliteTable('directory-watcher', {
  ...CommonSchema(),
  templateId: id().references((): AnySQLiteColumn => SubmissionSchema.id, {
    onDelete: 'set null',
  }),
  importAction: text({
    enum: [DirectoryWatcherImportAction.NEW_SUBMISSION],
  })
    .notNull()
    .default(DirectoryWatcherImportAction.NEW_SUBMISSION),
  path: text(),
});

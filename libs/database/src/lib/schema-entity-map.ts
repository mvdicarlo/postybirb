import type { Account } from './entities/account.entity';
import type { CustomShortcut } from './entities/custom-shortcut.entity';
import type { DirectoryWatcher } from './entities/directory-watcher.entity';
import type { FileBuffer } from './entities/file-buffer.entity';
import type { Notification } from './entities/notification.entity';
import type { PostEvent } from './entities/post-event.entity';
import type { PostQueueRecord } from './entities/post-queue-record.entity';
import type { PostRecord } from './entities/post-record.entity';
import type { Settings } from './entities/settings.entity';
import type { Submission } from './entities/submission.entity';
import type { SubmissionFile } from './entities/submission-file.entity';
import type { TagConverter } from './entities/tag-converter.entity';
import type { TagGroup } from './entities/tag-group.entity';
import type { UserConverter } from './entities/user-converter.entity';
import type { UserSpecifiedWebsiteOptions } from './entities/user-specified-website-options.entity';
import type { WebsiteData } from './entities/website-data.entity';
import type { WebsiteOptions } from './entities/website-options.entity';

/**
 * Compile-time map from `SchemaKey` to the entity class managed by the
 * corresponding repository. Used by `PostyBirbService<TKey>` to infer
 * the correct entity type for `findById`/`findAll`/`remove` return
 * values when a subclass only pins the schema key.
 *
 * Stays in sync with `libs/database/src/lib/repositories/*.repository.ts`.
 */
export type SchemaEntityMap = {
  AccountSchema: Account;
  CustomShortcutSchema: CustomShortcut;
  DirectoryWatcherSchema: DirectoryWatcher;
  FileBufferSchema: FileBuffer;
  NotificationSchema: Notification;
  PostEventSchema: PostEvent;
  PostQueueRecordSchema: PostQueueRecord;
  PostRecordSchema: PostRecord;
  SettingsSchema: Settings;
  SubmissionSchema: Submission;
  SubmissionFileSchema: SubmissionFile;
  TagConverterSchema: TagConverter;
  TagGroupSchema: TagGroup;
  UserConverterSchema: UserConverter;
  UserSpecifiedWebsiteOptionsSchema: UserSpecifiedWebsiteOptions;
  WebsiteDataSchema: WebsiteData;
  WebsiteOptionsSchema: WebsiteOptions;
};

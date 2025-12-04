import { SchemaKey } from '@postybirb/database';
import { Account } from '../models/account.entity';
import { CustomShortcut } from '../models/custom-shortcut.entity';
import { DirectoryWatcher } from '../models/directory-watcher.entity';
import { FileBuffer } from '../models/file-buffer.entity';
import { Notification } from '../models/notification.entity';
import { PostQueueRecord } from '../models/post-queue-record.entity';
import { PostRecord } from '../models/post-record.entity';
import { Settings } from '../models/settings.entity';
import { SubmissionFile } from '../models/submission-file.entity';
import { Submission } from '../models/submission.entity';
import { TagConverter } from '../models/tag-converter.entity';
import { TagGroup } from '../models/tag-group.entity';
import { UserConverter } from '../models/user-converter.entity';
import { UserSpecifiedWebsiteOptions } from '../models/user-specified-website-options.entity';
import { WebsiteData } from '../models/website-data.entity';
import { WebsiteOptions } from '../models/website-options.entity';
import { WebsitePostRecord } from '../models/website-post-record.entity';

export type DatabaseSchemaEntityMap = {
  AccountSchema: InstanceType<typeof Account>;
  DirectoryWatcherSchema: InstanceType<typeof DirectoryWatcher>;
  FileBufferSchema: InstanceType<typeof FileBuffer>;
  PostQueueRecordSchema: InstanceType<typeof PostQueueRecord>;
  PostRecordSchema: InstanceType<typeof PostRecord>;
  SettingsSchema: InstanceType<typeof Settings>;
  SubmissionFileSchema: InstanceType<typeof SubmissionFile>;
  SubmissionSchema: InstanceType<typeof Submission>;
  TagConverterSchema: InstanceType<typeof TagConverter>;
  TagGroupSchema: InstanceType<typeof TagGroup>;
  UserConverterSchema: InstanceType<typeof UserConverter>;
  UserSpecifiedWebsiteOptionsSchema: InstanceType<
    typeof UserSpecifiedWebsiteOptions
  >;
  WebsiteDataSchema: InstanceType<typeof WebsiteData>;
  WebsiteOptionsSchema: InstanceType<typeof WebsiteOptions>;
  WebsitePostRecordSchema: InstanceType<typeof WebsitePostRecord>;
  NotificationSchema: InstanceType<typeof Notification>;
  CustomShortcutSchema: InstanceType<typeof CustomShortcut>;
};

export const DatabaseSchemaEntityMapConst: Record<
  SchemaKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  InstanceType<any>
> = {
  AccountSchema: Account,
  DirectoryWatcherSchema: DirectoryWatcher,
  FileBufferSchema: FileBuffer,
  PostQueueRecordSchema: PostQueueRecord,
  PostRecordSchema: PostRecord,
  SettingsSchema: Settings,
  SubmissionFileSchema: SubmissionFile,
  SubmissionSchema: Submission,
  TagConverterSchema: TagConverter,
  TagGroupSchema: TagGroup,
  UserConverterSchema: UserConverter,
  UserSpecifiedWebsiteOptionsSchema: UserSpecifiedWebsiteOptions,
  WebsiteDataSchema: WebsiteData,
  WebsiteOptionsSchema: WebsiteOptions,
  WebsitePostRecordSchema: WebsitePostRecord,
  NotificationSchema: Notification,
  CustomShortcutSchema: CustomShortcut,
};

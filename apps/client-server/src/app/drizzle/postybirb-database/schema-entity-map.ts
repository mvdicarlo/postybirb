import { SchemaKey } from '@postybirb/database';
import {
  Account,
  DirectoryWatcher,
  FileBuffer,
  PostQueueRecord,
  PostRecord,
  Settings,
  Submission,
  SubmissionFile,
  TagConverter,
  TagGroup,
  UserSpecifiedWebsiteOptions,
  WebsiteData,
  WebsiteOptions,
  WebsitePostRecord,
} from '../models';
import { CustomShortcut } from '../models/custom-shortcut.entity';
import { Notification } from '../models/notification.entity';

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
  UserSpecifiedWebsiteOptionsSchema: UserSpecifiedWebsiteOptions,
  WebsiteDataSchema: WebsiteData,
  WebsiteOptionsSchema: WebsiteOptions,
  WebsitePostRecordSchema: WebsitePostRecord,
  NotificationSchema: Notification,
  CustomShortcutSchema: CustomShortcut,
};

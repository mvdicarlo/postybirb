import { Account, CustomShortcut, DirectoryWatcher, FileBuffer, Notification, PostEvent, PostQueueRecord, PostRecord, SchemaKey, Settings, Submission, SubmissionFile } from '@postybirb/database';
import {
    TagConverter,
    TagGroup,
    UserConverter,
    UserSpecifiedWebsiteOptions,
    WebsiteData,
    WebsiteOptions,
} from '../models';

export type DatabaseSchemaEntityMap = {
  AccountSchema: InstanceType<typeof Account>;
  DirectoryWatcherSchema: InstanceType<typeof DirectoryWatcher>;
  FileBufferSchema: InstanceType<typeof FileBuffer>;
  PostEventSchema: InstanceType<typeof PostEvent>;
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
  PostEventSchema: PostEvent,
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
  NotificationSchema: Notification,
  CustomShortcutSchema: CustomShortcut,
};

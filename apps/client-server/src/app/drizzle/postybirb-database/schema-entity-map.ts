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
import { SchemaKey } from './postybirb-database';

export type DatabaseSchemaEntityMap = {
  account: InstanceType<typeof Account>;
  directoryWatcher: InstanceType<typeof DirectoryWatcher>;
  fileBuffer: InstanceType<typeof FileBuffer>;
  postQueueRecord: InstanceType<typeof PostQueueRecord>;
  postRecord: InstanceType<typeof PostRecord>;
  settings: InstanceType<typeof Settings>;
  submissionFile: InstanceType<typeof SubmissionFile>;
  submission: InstanceType<typeof Submission>;
  tagConverter: InstanceType<typeof TagConverter>;
  tagGroup: InstanceType<typeof TagGroup>;
  userSpecifiedWebsiteOptions: InstanceType<typeof UserSpecifiedWebsiteOptions>;
  websiteData: InstanceType<typeof WebsiteData>;
  websiteOptions: InstanceType<typeof WebsiteOptions>;
  websitePostRecord: InstanceType<typeof WebsitePostRecord>;
};

export const DatabaseSchemaEntityMapConst: Record<
  SchemaKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  InstanceType<any>
> = {
  account: Account,
  directoryWatcher: DirectoryWatcher,
  fileBuffer: FileBuffer,
  postQueueRecord: PostQueueRecord,
  postRecord: PostRecord,
  settings: Settings,
  submissionFile: SubmissionFile,
  submission: Submission,
  tagConverter: TagConverter,
  tagGroup: TagGroup,
  userSpecifiedWebsiteOptions: UserSpecifiedWebsiteOptions,
  websiteData: WebsiteData,
  websiteOptions: WebsiteOptions,
  websitePostRecord: WebsitePostRecord,
};

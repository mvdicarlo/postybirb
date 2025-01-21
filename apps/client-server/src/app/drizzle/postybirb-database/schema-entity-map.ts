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

export type DatabaseSchemaEntityMap = {
  account: Account;
  directoryWatcher: DirectoryWatcher;
  fileBuffer: FileBuffer;
  postQueueRecord: PostQueueRecord;
  postRecord: PostRecord;
  settings: Settings;
  submissionFile: SubmissionFile;
  submission: Submission;
  tagConverter: TagConverter;
  tagGroup: TagGroup;
  userSpecifiedWebsiteOptions: UserSpecifiedWebsiteOptions;
  websiteData: WebsiteData;
  websiteOptions: WebsiteOptions;
  websitePostRecord: WebsitePostRecord;
};

export const DatabaseSchemaEntityMapConst = {
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

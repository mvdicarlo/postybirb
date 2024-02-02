import { MikroOrmModule, MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import { IsTestEnvironment } from '../utils/test.util';
import {
  Account,
  AltFile,
  DirectoryWatcher,
  PostRecord,
  PrimaryFile,
  Settings,
  Submission,
  SubmissionFile,
  TagConverter,
  TagGroup,
  ThumbnailFile,
  UserSpecifiedWebsiteOptions,
  WebsiteData,
  WebsiteOptions,
  WebsitePostRecord,
} from './entities';

const entities = [
  Account,
  AltFile,
  DirectoryWatcher,
  PrimaryFile,
  Settings,
  Submission,
  SubmissionFile,
  TagConverter,
  TagGroup,
  WebsiteOptions,
  ThumbnailFile,
  UserSpecifiedWebsiteOptions,
  WebsiteData,
  PostRecord,
  WebsitePostRecord,
];

const mikroOrmOptions: MikroOrmModuleSyncOptions = {
  entities,
  type: 'sqlite',
  dbName: IsTestEnvironment()
    ? ':memory:'
    : join(PostyBirbDirectories.DATA_DIRECTORY, 'database.db'),
};

export const getDatabaseProvider = () => [
  MikroOrmModule.forRoot({
    ...mikroOrmOptions,
    allowGlobalContext: true,
  }),
  MikroOrmModule.forFeature({ entities }),
];

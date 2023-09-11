import { MikroOrmModule, MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import { IsTestEnvironment } from '../utils/test.util';
import {
  Account,
  AltFile,
  DirectoryWatcher,
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
} from './entities';
import { SubmissionTemplate } from './entities/submission-template.entity';

const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database.db');

const entities = [
  Account,
  AltFile,
  DirectoryWatcher,
  PrimaryFile,
  Settings,
  Submission,
  SubmissionFile,
  SubmissionTemplate,
  TagConverter,
  TagGroup,
  WebsiteOptions,
  ThumbnailFile,
  UserSpecifiedWebsiteOptions,
  WebsiteData,
];

const mikroOrmOptions: MikroOrmModuleSyncOptions = {
  entities,
  type: 'sqlite',
  dbName: IsTestEnvironment() ? ':memory:' : DATABASE_PATH,
};

export const getDatabaseProvider = () => [
  MikroOrmModule.forRoot({ ...mikroOrmOptions, allowGlobalContext: true }),
  MikroOrmModule.forFeature({ entities }),
];

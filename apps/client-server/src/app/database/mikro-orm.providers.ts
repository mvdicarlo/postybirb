import { MikroOrmModule, MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import {
  Account,
  AltFile,
  SubmissionFile,
  PrimaryFile,
  ThumbnailFile,
  WebsiteData,
  WebsiteOptions,
  Submission,
  Settings,
  TagGroup,
  TagConverter,
  DirectoryWatcher,
} from './entities';
import { IsTestEnvironment } from '../utils/test.util';

const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database.db');

const entities = [
  Account,
  SubmissionFile,
  AltFile,
  PrimaryFile,
  ThumbnailFile,
  WebsiteData,
  WebsiteOptions,
  Submission,
  Settings,
  TagGroup,
  TagConverter,
  DirectoryWatcher,
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
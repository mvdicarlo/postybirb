import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule, MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { PostyBirbDirectories } from '@postybirb/fs';
import { unlinkSync } from 'fs';
import { join } from 'path';
import {
  Account,
  AltFile,
  SubmissionFile,
  PrimaryFile,
  ThumbnailFile,
  WebsiteData,
  SubmissionAccountData,
  Submission,
  Settings,
  TagGroup,
  TagConverter,
  DirectoryWatcher,
} from './entities';

const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database.db');

const entities = [
  Account,
  SubmissionFile,
  AltFile,
  PrimaryFile,
  ThumbnailFile,
  WebsiteData,
  SubmissionAccountData,
  Submission,
  Settings,
  TagGroup,
  TagConverter,
  DirectoryWatcher,
];

const mikroOrmOptions: MikroOrmModuleSyncOptions = {
  entities,
  type: 'sqlite',
  dbName: DATABASE_PATH,
};

export function cleanTestDatabase(): void {
  try {
    unlinkSync(DATABASE_PATH);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export const getDatabaseProvider = () => [
  MikroOrmModule.forRoot({ ...mikroOrmOptions, allowGlobalContext: true }),
  MikroOrmModule.forFeature({ entities }),
];

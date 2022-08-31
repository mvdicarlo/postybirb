import { MikroORM } from '@mikro-orm/core';
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
  SubmissionOptions,
  Submission,
  Settings,
} from './entities';

const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database2.db');

const entities = [
  Account,
  SubmissionFile,
  AltFile,
  PrimaryFile,
  ThumbnailFile,
  WebsiteData,
  SubmissionOptions,
  Submission,
  Settings,
];

const mikroOrmOptions: MikroOrmModuleSyncOptions = {
  entities,
  type: 'sqlite',
  dbName: DATABASE_PATH,
};

export async function initializeDatabase(): Promise<void> {
  const orm = await MikroORM.init(mikroOrmOptions);

  const generator = orm.getSchemaGenerator();
  // const schemaUpdate = await generator.getUpdateSchemaSQL();
  // console.log(schemaUpdate);
  // await generator.createSchema();
  await generator.updateSchema();
  await orm.close();
}

export const getDatabaseProvider = () => [
  MikroOrmModule.forRoot({ ...mikroOrmOptions, allowGlobalContext: true }),
  MikroOrmModule.forFeature({ entities }),
];

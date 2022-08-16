import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule, MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import { Account } from './entities/';

const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database.db');

const entities = [Account];

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

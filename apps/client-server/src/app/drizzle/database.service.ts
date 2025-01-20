import { Injectable } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { IsTestEnvironment } from '../utils/test.util';
import * as schema from './schemas';

export type PostyBirbDatabase = BetterSQLite3Database<typeof schema>;

@Injectable()
export class Database {
  private readonly db: BetterSQLite3Database<typeof schema>;

  public get dbInstance() {
    return this.db;
  }

  constructor() {
    const migrationsFolder = join(__dirname, 'migrations');
    const path = IsTestEnvironment()
      ? ':memory:'
      : join(PostyBirbDirectories.DATA_DIRECTORY, 'drizzle.db');
    this.db = drizzle(path, { schema });
    migrate(this.db, { migrationsFolder });
  }
}

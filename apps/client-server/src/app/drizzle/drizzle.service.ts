import { Injectable } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { IsTestEnvironment } from '../utils/test.util';

@Injectable()
export class DrizzleService {
  private db: Database;

  constructor() {
    const migrationsFolder = join(__dirname, 'migrations');
    const path = IsTestEnvironment()
      ? ':memory:'
      : join(PostyBirbDirectories.DATA_DIRECTORY, 'drizzle.db');
    this.db = drizzle(path);
    migrate(this.db, { migrationsFolder });
  }

  async getAllUsers() {
    return this.db.select().from(user).execute();
  }

  async addUser(newUser: any) {
    return this.db.insert().into(user).values(newUser).execute();
  }

  async updateUser(id: number, updateUser: any) {
    return this.db.update(user).set(updateUser).where({ id }).execute();
  }

  async deleteUser(id: number) {
    return this.db.delete().from(user).where({ id }).execute();
  }
}

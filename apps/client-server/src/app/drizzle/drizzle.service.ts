import { Injectable } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { IsTestEnvironment } from '../utils/test.util';
import { Account } from './models/account.entity';
import * as schema from './schemas';

type InsertSubmission = typeof schema.submission.$inferInsert;
type InsertWebsiteOptions = typeof schema.websiteOptions.$inferInsert;

@Injectable()
export class DrizzleService {
  private db: BetterSQLite3Database<typeof schema>;

  constructor() {
    const migrationsFolder = join(__dirname, 'migrations');
    const path = IsTestEnvironment()
      ? ':memory:'
      : join(PostyBirbDirectories.DATA_DIRECTORY, 'drizzle.db');
    this.db = drizzle(path, { schema });
    migrate(this.db, { migrationsFolder });
    this.createTagConverter()
      .catch(console.error)
      .finally(() => {
        this.getTagConverters().then((recs) => {
          const mapped = recs.map((rec) => Account.fromDBO(rec));
          console.log(mapped);
          console.log(mapped.map((m) => m.toJson()));
        });
      });
  }

  private async createTagConverter() {
    // const acc = await this.db
    //   .insert(schema.account)
    //   .values({
    //     name: 'account',
    //     website: 'website',
    //   })
    //   .returning();
    // const wc = await this.db
    //   .insert(schema.websiteData)
    //   .values({
    //     accountId: acc[0].id,
    //     website: 'website',
    //     name: 'website',
    //   })
    //   .returning();
    // const newSubmission: InsertSubmission = {
    //   order: await this.db.$count(schema.submission),
    //   schedule: {
    //     scheduleType: ScheduleType.NONE,
    //   },
    //   metadata: {},
    //   submissionType: SubmissionType.MESSAGE,
    // };
    // const submission = await this.db
    //   .insert(schema.submission)
    //   .values(newSubmission)
    //   .returning();
    // const newWebsiteOptions: InsertWebsiteOptions = {
    //   accountId: acc[0].id,
    //   submissionId: submission[0].id,
    //   data: new BaseWebsiteOptions(),
    // };
    // const websiteOptions = await this.db
    //   .insert(schema.websiteOptions)
    //   .values(newWebsiteOptions)
    //   .returning();
  }

  private getTagConverters() {
    return this.db.query.account.findMany({
      with: {
        websiteData: true,
        websiteOptions: {
          with: {
            submission: true,
          },
        },
      },
    });
  }
}

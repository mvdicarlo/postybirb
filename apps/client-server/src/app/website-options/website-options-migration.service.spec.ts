import {
  Account,
  AccountRepository,
  clearDatabase,
  getDatabase,
  Submission,
  SubmissionRepository,
  WebsiteOptionsRepository,
  WebsiteOptionsSchema,
} from '@postybirb/database';
import {
  IWebsiteFormFields,
  NULL_ACCOUNT_ID,
  SubmissionType,
} from '@postybirb/types';
import { eq, sql } from 'drizzle-orm';
import { SubmissionEventPublisher } from '../submission/submission-event.publisher';
import {
  getWebsiteOptionsMigrations,
  MigrateWebsiteOptions,
} from '../websites/decorators/migrate-website-options.decorator';
import { TestFileSubmission } from '../websites/implementations/test/models/test-file-submission';
import {
  WebsiteOptionsModelDefinition,
  WebsiteRegistryService,
} from '../websites/website-registry.service';
import { WebsiteOptionsMigrationService } from './website-options-migration.service';

describe('Website option migrations', () => {
  it('keeps an ordered history owned by each model', () => {
    const migrations = [
      {
        version: 1,
        name: 'First change',
        migrate: (data: object) => ({ ...data }),
      },
      {
        version: 2,
        name: 'Second change',
        migrate: (data: object) => ({ ...data }),
      },
    ];

    @MigrateWebsiteOptions(migrations)
    class Model {}
    class Derived extends Model {}

    expect(getWebsiteOptionsMigrations(Model)).toEqual(migrations);
    expect(getWebsiteOptionsMigrations(Derived)).toEqual([]);
    expect(() => MigrateWebsiteOptions([migrations[1]])).toThrow(/consecutive/);
    expect(() => MigrateWebsiteOptions([migrations[0], migrations[0]])).toThrow(
      /consecutive/,
    );
  });

  async function setup() {
    clearDatabase();
    const db = getDatabase();
    const accounts = new AccountRepository();
    const submissions = new SubmissionRepository();
    const options = new WebsiteOptionsRepository();
    for (const website of ['test', 'other', NULL_ACCOUNT_ID]) {
      await accounts.insert(
        new Account({ id: website, name: website, website }),
      );
    }
    for (const type of [SubmissionType.FILE, SubmissionType.MESSAGE]) {
      await submissions.insert(
        new Submission({
          id: type,
          type,
          isArchived: true,
          isTemplate: true,
        }),
      );
    }
    const markChanged = jest.fn();
    const getOptionModelDefinitions = jest.fn<
      Promise<WebsiteOptionsModelDefinition[]>,
      []
    >();
    const service = new WebsiteOptionsMigrationService(
      { getOptionModelDefinitions } as unknown as WebsiteRegistryService,
      { markChanged } as unknown as SubmissionEventPublisher,
    );
    const insert = (
      id: string,
      data: Record<string, unknown>,
      accountId = 'test',
      submissionId = SubmissionType.FILE,
      migrationVersion = 0,
    ) =>
      options.insert({
        id,
        accountId,
        submissionId,
        migrationVersion,
        isDefault: accountId === NULL_ACCOUNT_ID,
        data: data as unknown as IWebsiteFormFields,
        updatedAt: '2020-01-01T00:00:00.000Z',
      });
    const read = (id: string) => {
      const row = db
        .select()
        .from(WebsiteOptionsSchema)
        .where(eq(WebsiteOptionsSchema.id, id))
        .get();
      if (!row) {
        throw new Error(`Missing test option '${id}'`);
      }
      return { ...row, data: row.data as unknown as Record<string, unknown> };
    };
    return {
      db,
      options,
      service,
      getOptionModelDefinitions,
      markChanged,
      insert,
      read,
    };
  }

  it('scopes SQL candidates, advances no-ops, and never reruns completed bundles', async () => {
    const fixture = await setup();
    const migrate = jest.fn(
      getWebsiteOptionsMigrations(TestFileSubmission)[0].migrate,
    );
    fixture.getOptionModelDefinitions.mockResolvedValue([
      {
        website: 'test',
        type: SubmissionType.FILE,
        migrations: [
          {
            version: 1,
            name: 'Array replies',
            migrate,
            where: ({ data }) =>
              sql`json_type(${data}, '$.whoCanReply') = 'text'`,
          },
        ],
      },
    ]);
    await fixture.insert('match', {
      whoCanReply: 'mention,following',
      title: 'Keep me',
    });
    await fixture.insert('empty', { whoCanReply: '' });
    await fixture.insert('null', { whoCanReply: null });
    await fixture.insert('absent', { title: 'Keep me' });
    await fixture.insert('array', { whoCanReply: ['mention'] });
    await fixture.insert('other', { whoCanReply: 'mention' }, 'other');
    await fixture.insert(
      'message',
      { whoCanReply: 'mention' },
      'test',
      SubmissionType.MESSAGE,
    );
    await fixture.insert(
      'default',
      { whoCanReply: 'mention' },
      NULL_ACCOUNT_ID,
    );
    await fixture.insert(
      'future',
      { whoCanReply: 'mention' },
      'test',
      SubmissionType.FILE,
      5,
    );

    expect(await fixture.service.runPendingMigrations()).toEqual({
      updated: 2,
      advanced: 3,
      failed: 0,
      futureVersions: 1,
    });
    expect(fixture.read('match').data).toEqual({
      whoCanReply: ['mention', 'following'],
      title: 'Keep me',
    });
    expect(fixture.read('empty').data.whoCanReply).toEqual([]);
    expect(fixture.read('absent')).toMatchObject({
      migrationVersion: 1,
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    for (const id of ['other', 'message', 'default']) {
      expect(fixture.read(id).migrationVersion).toBe(0);
    }
    expect(migrate).toHaveBeenCalledTimes(2);
    expect(fixture.markChanged).toHaveBeenCalledWith([SubmissionType.FILE]);
    await fixture.service.runPendingMigrations();
    expect(migrate).toHaveBeenCalledTimes(2);

    fixture.getOptionModelDefinitions.mockResolvedValue([
      {
        website: NULL_ACCOUNT_ID,
        type: SubmissionType.FILE,
        migrations: [{ version: 1, name: 'Shared defaults', migrate }],
      },
    ]);
    await fixture.service.runPendingMigrations();
    expect(fixture.read('default')).toMatchObject({
      migrationVersion: 1,
      data: { whoCanReply: ['mention'] },
    });
    expect(fixture.read('other').migrationVersion).toBe(0);
  });

  it('keeps the last successful version on failure and continues beyond a full page', async () => {
    const fixture = await setup();
    let fail = true;
    fixture.getOptionModelDefinitions.mockResolvedValue([
      {
        website: 'test',
        type: SubmissionType.FILE,
        migrations: [
          {
            version: 1,
            name: 'Array replies',
            migrate: (data) => ({ ...data, whoCanReply: [data.whoCanReply] }),
          },
          {
            version: 2,
            name: 'Back to text',
            migrate: (data) => {
              const replies = data.whoCanReply;
              if (!Array.isArray(replies)) {
                throw new Error('Expected array replies');
              }
              if (data.fail && fail) {
                replies.push('must not persist');
                throw new Error('Forced migration failure');
              }
              return { ...data, whoCanReply: replies.join(',') };
            },
          },
        ],
      },
    ]);
    await fixture.insert('000-failure', { whoCanReply: 'mention', fail: true });
    for (let index = 0; index < 201; index++) {
      await fixture.insert(`good-${String(index).padStart(3, '0')}`, {
        whoCanReply: 'following',
      });
    }
    expect((await fixture.service.runPendingMigrations()).failed).toBe(1);
    expect(fixture.read('000-failure')).toMatchObject({
      migrationVersion: 1,
      data: { whoCanReply: ['mention'], fail: true },
    });
    expect(fixture.read('good-200')).toMatchObject({
      migrationVersion: 2,
      data: { whoCanReply: 'following' },
    });
    fail = false;
    expect((await fixture.service.runPendingMigrations()).failed).toBe(0);
    expect(fixture.read('000-failure')).toMatchObject({
      migrationVersion: 2,
      data: { whoCanReply: 'mention', fail: true },
    });
    expect(fixture.read('good-200').data.whoCanReply).toBe('following');
  });
});

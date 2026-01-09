import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { eq } from 'drizzle-orm';
import { Account } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { PostyBirbDatabaseUtil } from '../drizzle/postybirb-database/postybirb-database.util';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('Website', () => {
  let module: TestingModule;

  let repository: PostyBirbDatabase<'WebsiteDataSchema'>;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [WebsiteRegistryService, WebsiteImplProvider],
    }).compile();
    const service = module.get(WebsiteRegistryService);
    repository = service.getRepository();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  function populateAccount(): Promise<Account> {
    return PostyBirbDatabaseUtil.saveFromEntity(
      new Account({
        name: 'test',
        website: 'test',
        groups: [],
        id: 'test',
      }),
    );
  }

  it('should store data', async () => {
    const website = new TestWebsite(await populateAccount());
    await website.onInitialize(repository);
    website.onBeforeLogin();
    await website.onLogin();
    website.onAfterLogin();
    const entity = (
      await repository.select(eq(repository.schemaEntity.id, website.accountId))
    )[0];
    expect(entity.data).toEqual({ test: 'test-mode' });
  }, 10000);

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.decoratedProps).not.toBeUndefined();
  });
});

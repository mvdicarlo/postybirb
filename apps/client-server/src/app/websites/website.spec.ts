import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import { eq } from 'drizzle-orm';
import { Account } from '@postybirb/database';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { PostyBirbDatabaseUtil } from '../drizzle/postybirb-database/postybirb-database.util';
import { createNoopPlatformContext } from '../platform/testing/noop-platform-context';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('Website', () => {
  let module: TestingModule;

  let repository: PostyBirbDatabase<'WebsiteDataSchema'>;
  let platformContext: PlatformService;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [
        WebsiteRegistryService,
        WebsiteImplProvider,
        noopPlatformProvider,
      ],
    }).compile();
    const service = module.get(WebsiteRegistryService);
    repository = service.getRepository();
    platformContext = createNoopPlatformContext();
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
    const website = new TestWebsite(await populateAccount(), platformContext);
    await website.onInitialize(repository);
    await website.login();
    const entity = (
      await repository.select(eq(repository.schemaEntity.id, website.accountId))
    )[0];
    expect(entity.data).toEqual({ test: 'test-mode' });
  }, 10000);

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.decoratedProps).not.toBeUndefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { Account, fromDatabaseRecord } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('Website', () => {
  let module: TestingModule;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let repository: PostyBirbDatabase<'websiteData'>;

  beforeEach(async () => {
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

  it('should store data', async () => {
    const website = new TestWebsite(
      fromDatabaseRecord(Account, {
        id: 'store',
        name: 'test',
        website: 'test',
        groups: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await website.onInitialize(repository);
    website.onBeforeLogin();
    await website.onLogin();
    website.onAfterLogin();
    const entity = await repository.select(
      eq(repository.schemaEntity.accountId, website.accountId),
    )[0];
    expect(entity.data).toEqual({ test: 'test-mode' });
  });

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.decoratedProps).not.toBeUndefined();
  });
});

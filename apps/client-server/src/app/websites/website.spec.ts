import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TestMetadata } from '@postybirb/website-metadata';
import { DatabaseModule } from '../database/database.module';
import { WebsiteData } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { WebsiteImplProvider } from './implementations';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('Website', () => {
  let module: TestingModule;
  let orm: MikroORM;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let repository: PostyBirbRepository<WebsiteData<any>>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [WebsiteRegistryService, WebsiteImplProvider],
    }).compile();
    const service = module.get(WebsiteRegistryService);
    repository = service.getRepository();
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should store data', async () => {
    const website = new TestWebsite({
      id: 'store',
      name: 'test',
      website: 'test',
      groups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await website.onInitialize(repository);
    website.onBeforeLogin();
    await website.onLogin();
    website.onAfterLogin();
    const entity = await repository.findOne(website.accountId);
    expect(entity.data).toEqual({ test: 'test-mode' });
  });

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.metadata).toEqual({
      ...TestMetadata,
      refreshInterval: 60_000 * 60,
      supportsTags: true,
    });
  });
});

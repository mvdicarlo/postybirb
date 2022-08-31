import { EntityRepository } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TestMetadata } from '@postybirb/website-metadata';
import { DatabaseModule } from '../database/database.module';
import { WebsiteData } from '../database/entities';
import { initializeDatabase } from '../database/mikroorm.providers';
import TestWebsite from './implementations/test/test.website';
import { WebsiteDataService } from './website-data.service';

describe('Website', () => {
  let testingModule: TestingModule;
  let service: WebsiteDataService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let repository: EntityRepository<WebsiteData<any>>;

  beforeAll(async () => {
    await initializeDatabase();
  });

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [WebsiteDataService],
    }).compile();

    service = testingModule.get(WebsiteDataService);
    repository = service.getRepository();
  });

  afterEach(async () => {
    await testingModule.close();
  });

  it('should store data', async () => {
    const website = new TestWebsite({
      id: 'store',
      name: 'test',
      website: 'test',
      groups: [],
    });

    await website.onInitialize(repository);
    await website.onLogin();

    const entity = await repository.findOne(website.accountId);
    expect(entity.data).toEqual({ test: 'test-mode' });
  });

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.metadata).toEqual({
      ...TestMetadata,
      refreshInterval: 60_000 * 60,
    });
  });
});

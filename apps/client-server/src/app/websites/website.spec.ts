import { Test, TestingModule } from '@nestjs/testing';
import { TestMetadata } from '@postybirb/website-metadata';
import { getRepository, Repository } from 'typeorm';
import { DATABASE_CONNECTION } from '../constants';
import { getTestDatabaseProvider } from '../database/typeorm.providers';
import { WebsiteData } from './entities/website-data.entity';
import TestWebsite from './implementations/test/test.website';
import { websiteDataProvider } from './providers/website-data.provider';

describe('Website', () => {
  let repository: Repository<WebsiteData<any>>;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [getTestDatabaseProvider([WebsiteData]), websiteDataProvider],
    }).compile();

    repository = getRepository(WebsiteData, DATABASE_CONNECTION);
  });

  afterEach(async () => {
    await repository.manager.connection.close();
    await testingModule.close();
  });

  it('should store data', async () => {
    const website = new TestWebsite({
      id: 'store',
      name: 'test',
      website: 'test',
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

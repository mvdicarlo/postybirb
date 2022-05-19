import { Test, TestingModule } from '@nestjs/testing';
import { getRepository, Repository } from 'typeorm';
import { Account } from '../account/entities/account.entity';
import { DATABASE_CONNECTION } from '../constants';
import { getTestDatabaseProvider } from '../database/typeorm.providers';
import { SafeObject } from '../shared/types/safe-object';
import { WebsiteData } from './entities/website-data.entity';
import { websiteImplementationProvider } from './implementations';
import TestWebsite from './implementations/test/test.website';
import { WebsiteDataProvider } from './providers/website-data.provider';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  let repository: Repository<WebsiteData<SafeObject>>;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        getTestDatabaseProvider([WebsiteData]),
        WebsiteDataProvider,
        WebsiteRegistryService,
        websiteImplementationProvider,
      ],
    }).compile();

    service = testingModule.get<WebsiteRegistryService>(WebsiteRegistryService);
    repository = getRepository(WebsiteData, DATABASE_CONNECTION);
  });

  afterEach(async () => {
    await repository.manager.connection.close();
    await testingModule.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register test website', () => {
    const available = service.getAvailableWebsites();
    expect(available.length).toBeGreaterThanOrEqual(1);
    expect(available.filter((w) => w === TestWebsite)).toBeDefined();
  });

  it('should successfully create website instance', async () => {
    const account = new Account({
      name: 'test',
      id: 'test',
      website: TestWebsite.prototype.metadata.name,
    });

    const instance = await service.create(account);
    expect(instance instanceof TestWebsite).toBe(true);
    expect(service.findInstance(account)).toEqual(instance);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(1);
  });

  it('should successfully remove website instance', async () => {
    const account = new Account({
      name: 'test',
      id: 'test',
      website: TestWebsite.prototype.metadata.name,
    });

    const instance = await service.create(account);
    await instance.onLogin();
    expect(instance instanceof TestWebsite).toBe(true);
    await service.remove(account);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(0);
  });
});

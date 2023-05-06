import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { Account, WebsiteData } from '../database/entities';
import { initializeDatabase } from '../database/mikro-orm.providers';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { websiteImplementationProvider } from './implementations';
import TestWebsite from './implementations/test/test.website';
import { WebsiteDataService } from './website-data.service';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let repository: PostyBirbRepository<WebsiteData<any>>;
  let testingModule: TestingModule;

  beforeAll(async () => {
    await initializeDatabase();
  });

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        WebsiteDataService,
        WebsiteRegistryService,
        websiteImplementationProvider,
      ],
    }).compile();

    service = testingModule.get<WebsiteRegistryService>(WebsiteRegistryService);
    repository = testingModule
      .get<WebsiteDataService>(WebsiteDataService)
      .getRepository();
  });

  afterEach(async () => {
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

  // it('should successfully create website instance', async () => {
  //   const account = new Account({
  //     name: 'test',
  //     id: 'test',
  //     website: TestWebsite.prototype.metadata.name,
  //   });

  //   const instance = await service.create(account);
  //   expect(instance instanceof TestWebsite).toBe(true);
  //   expect(service.findInstance(account)).toEqual(instance);
  //   expect(service.getInstancesOf(TestWebsite)).toHaveLength(1);
  // });

  // it('should successfully remove website instance', async () => {
  //   const account = new Account({
  //     name: 'test',
  //     id: 'test',
  //     website: TestWebsite.prototype.metadata.name,
  //   });

  //   const instance = await service.create(account);
  //   await instance.onLogin();
  //   expect(instance instanceof TestWebsite).toBe(true);
  //   await service.remove(account);
  //   expect(service.getInstancesOf(TestWebsite)).toHaveLength(0);
  // });
});

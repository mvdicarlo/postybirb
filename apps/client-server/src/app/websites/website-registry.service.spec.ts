import { Test, TestingModule } from '@nestjs/testing';
import { Account } from '../drizzle/models';
import { clearDatabase } from '../drizzle/postybirb-database/database-instance';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  let module: TestingModule;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [WebsiteRegistryService, WebsiteImplProvider],
    }).compile();

    service = module.get<WebsiteRegistryService>(WebsiteRegistryService);
  });

  afterAll(async () => {
    await module.close();
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
      website: TestWebsite.prototype.decoratedProps.metadata.name,
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
      website: TestWebsite.prototype.decoratedProps.metadata.name,
    });

    const instance = await service.create(account);
    await instance.onLogin();
    expect(instance instanceof TestWebsite).toBe(true);
    await service.remove(account);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(0);
  });
});

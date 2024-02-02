import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { Account } from '../database/entities';
import { WebsiteImplProvider } from './implementations';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [WebsiteRegistryService, WebsiteImplProvider],
    }).compile();

    service = module.get<WebsiteRegistryService>(WebsiteRegistryService);
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
    expect(service).toBeDefined();
  });

  it('should register test website', () => {
    const available = service.getAvailableWebsites();
    expect(available.length).toBeGreaterThanOrEqual(1);
    expect(available.filter((w) => w === TestWebsite)).toBeDefined();
  });

  it('should successfully create website instance', async () => {
    const account = new Account();

    Object.assign(account, {
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
    const account = new Account();

    Object.assign(account, {
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

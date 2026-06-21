import { Test, TestingModule } from '@nestjs/testing';
import { Account, AccountRepository, clearDatabase } from '@postybirb/database';
import { ProxyModule } from '../proxy/proxy.module';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  let module: TestingModule;
  let accountRepository: AccountRepository;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [ProxyModule],
      providers: [
        WebsiteRegistryService,
        WebsiteImplProvider,
        ...[noopPlatformProvider],
      ],
    }).compile();

    service = module.get<WebsiteRegistryService>(WebsiteRegistryService);
    accountRepository = new AccountRepository();
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
    const account = await accountRepository.insert(
      new Account({
        name: 'test',
        id: 'test',
        website: TestWebsite.prototype.decoratedProps.metadata.name,
      }),
    );

    const instance = await service.create(account);
    expect(instance instanceof TestWebsite).toBe(true);
    expect(service.findInstance(account)).toEqual(instance);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(1);
  });

  it('should successfully remove website instance', async () => {
    const account = await accountRepository.insert(
      new Account({
        name: 'test',
        id: 'test',
        website: TestWebsite.prototype.decoratedProps.metadata.name,
      }),
    );

    const instance = await service.create(account);
    await instance.login();
    expect(instance instanceof TestWebsite).toBe(true);
    await service.remove(account);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(0);
  }, 30_000);
});

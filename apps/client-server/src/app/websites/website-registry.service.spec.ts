import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Account, AccountRepository, clearDatabase } from '@postybirb/database';
import {
  ACCOUNT_STATE_CHANGED,
  AccountStateChangedEvent,
} from '../account/account.events';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  let module: TestingModule;
  let accountRepository: AccountRepository;
  let eventEmitter: EventEmitter2;
  let emit: jest.SpyInstance;

  beforeEach(async () => {
    clearDatabase();
    eventEmitter = new EventEmitter2();
    emit = jest.spyOn(eventEmitter, 'emit');
    module = await Test.createTestingModule({
      providers: [
        WebsiteRegistryService,
        WebsiteImplProvider,
        { provide: EventEmitter2, useValue: eventEmitter },
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

  it('should share concurrent instance initialization', async () => {
    const account = await accountRepository.insert(
      new Account({ name: 'test', id: 'test', website: 'test' }),
    );

    const [first, second] = await Promise.all([
      service.create(account),
      service.create(account),
    ]);

    expect(first).toBe(second);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(1);
  });

  it('should return serializable account-free Website definitions', () => {
    const definition = service
      .getWebsiteDefinitions()
      .find((website) => website.id === 'test');

    expect(definition).toBeDefined();
    expect(definition).not.toHaveProperty('accounts');
    expect(typeof definition?.usernameShortcut?.id).not.toBe('function');
    expect(JSON.parse(JSON.stringify(definition))).toEqual(definition);
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
    expect(emit).toHaveBeenCalledWith(ACCOUNT_STATE_CHANGED, [
      new AccountStateChangedEvent(
        expect.objectContaining({ id: account.id }) as never,
      ),
    ]);
    await service.remove(account);
    expect(instance.isDisposed).toBe(true);
    expect(service.getInstancesOf(TestWebsite)).toHaveLength(0);
  }, 30_000);

  it('should recreate a fresh instance after removal is rolled back', async () => {
    const account = await accountRepository.insert(
      new Account({ name: 'test', id: 'test', website: 'test' }),
    );
    const original = await service.create(account);

    await service.remove(account);
    const recreated = await service.create(account);

    expect(original.isDisposed).toBe(true);
    expect(recreated).not.toBe(original);
    expect(recreated.isDisposed).toBe(false);
    expect(service.findInstance(account)).toBe(recreated);
  });

});

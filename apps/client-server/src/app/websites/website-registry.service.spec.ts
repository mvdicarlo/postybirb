import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Account, AccountRepository, clearDatabase } from '@postybirb/database';
import { WEBSITE_UPDATES } from '@postybirb/socket-events';
import { ACCOUNT_EVENT_PREFIX } from '../account/account.events';
import { publishEntityUpdated } from '../common/events/entity-crud.events';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { waitUntil } from '../utils/wait.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('WebsiteRegistryService', () => {
  let service: WebsiteRegistryService;
  let module: TestingModule;
  let accountRepository: AccountRepository;
  let eventEmitter: EventEmitter2;
  const webSocketEmit = jest.fn();

  beforeEach(async () => {
    clearDatabase();
    eventEmitter = new EventEmitter2();
    webSocketEmit.mockClear();
    module = await Test.createTestingModule({
      providers: [
        WebsiteRegistryService,
        WebsiteImplProvider,
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: WSGateway, useValue: { emit: webSocketEmit } },
        ...[noopPlatformProvider],
      ],
    }).compile();

    service = module.get<WebsiteRegistryService>(WebsiteRegistryService);
    service.onModuleInit();
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

  it('should refresh website updates from Account domain events', async () => {
    const account = await accountRepository.insert(
      new Account({
        name: 'test',
        id: 'test',
        website: TestWebsite.prototype.decoratedProps.metadata.name,
      }),
    );
    const instance = await service.create(account);
    webSocketEmit.mockClear();

    publishEntityUpdated(
      eventEmitter,
      ACCOUNT_EVENT_PREFIX,
      account.withWebsiteInstance(instance).toDTO(),
    );

    await waitUntil(() => webSocketEmit.mock.calls.length > 0, 10);
    expect(webSocketEmit).toHaveBeenCalledWith({
      event: WEBSITE_UPDATES,
      data: expect.any(Array),
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Account, AccountRepository, clearDatabase, saveFromEntity, WebsiteDataRepository } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import { eq } from 'drizzle-orm';
import { createNoopPlatformContext } from '../platform/testing/noop-platform-context';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { WebsiteImplProvider } from './implementations/provider';
import TestWebsite from './implementations/test/test.website';
import { WebsiteRegistryService } from './website-registry.service';

describe('Website', () => {
  let module: TestingModule;

  let repository: WebsiteDataRepository;
  let platformContext: PlatformService;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [
        WebsiteRegistryService,
        WebsiteImplProvider,
        noopPlatformProvider,
      ],
    }).compile();
    const service = module.get(WebsiteRegistryService);
    repository = service.getRepository();
    new AccountRepository();
    platformContext = createNoopPlatformContext();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  function populateAccount(): Promise<Account> {
    return saveFromEntity(
      new Account({
        name: 'test',
        website: 'test',
        groups: [],
        id: 'test',
      }),
    );
  }

  it('should store data', async () => {
    const website = new TestWebsite(await populateAccount(), platformContext);
    await website.onInitialize(repository);
    await website.login();
    const entity = (
      await repository.select(eq(repository.table.id, website.accountId))
    )[0];
    expect(entity.data).toEqual({ test: 'test-mode' });
  }, 10000);

  it('should report login projection transitions and final clear state', async () => {
    const website = new TestWebsite(await populateAccount(), platformContext);
    const onAccountProjectionChanged = jest.fn();
    await website.onInitialize(repository, onAccountProjectionChanged);

    await website.login();

    expect(onAccountProjectionChanged).toHaveBeenCalledTimes(4);
    expect(onAccountProjectionChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: website.accountId }),
    );

    onAccountProjectionChanged.mockClear();
    await website.clearLoginStateAndData();
    expect(onAccountProjectionChanged).toHaveBeenCalledTimes(1);
    expect(website.getLoginState().status).toBe('loggedOut');

    onAccountProjectionChanged.mockClear();
    await website.clearLoginStateAndData(true);
    expect(onAccountProjectionChanged).not.toHaveBeenCalled();
  });

  it('should report pending and restored state when login fails', async () => {
    const website = new TestWebsite(await populateAccount(), platformContext);
    const onAccountProjectionChanged = jest.fn();
    await website.onInitialize(repository, onAccountProjectionChanged);
    jest
      .spyOn(website as any, 'onLogin')
      .mockRejectedValueOnce(new Error('Login failed'));

    await website.login();

    expect(onAccountProjectionChanged).toHaveBeenCalledTimes(3);
    expect(website.getLoginState().status).toBe('idle');
  });

  it('should permanently dispose and clean up a deleted instance once', async () => {
    const website = new TestWebsite(await populateAccount(), platformContext);
    await website.onInitialize(repository);
    const clearStorageData = jest.spyOn(
      platformContext.session,
      'clearStorageData',
    );
    const onDelete = jest.spyOn(website as any, 'onDelete');

    await Promise.all([website.delete(), website.delete()]);

    expect(website.isDisposed).toBe(true);
    expect(clearStorageData).toHaveBeenCalledTimes(1);
    expect(clearStorageData).toHaveBeenCalledWith(website.accountId);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('should own and dispose its login refresh timer', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const website = new TestWebsite(await populateAccount(), platformContext);
    const onLogin = jest.spyOn(website as any, 'onLogin');
    website.decoratedProps.metadata.refreshInterval = 1_234;

    try {
      await website.onInitialize(repository);
      await website.login();

      expect(onLogin).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1_234);
      const timer = setIntervalSpy.mock.results.at(-1)?.value;

      await website.dispose();

      expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
    } finally {
      await website.dispose();
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    }
  });

  it('should keep mutable decorator properties isolated per instance', async () => {
    const first = new TestWebsite(await populateAccount(), platformContext);
    const secondAccount = await saveFromEntity(
      new Account({
        name: 'second',
        website: 'test',
        groups: [],
        id: 'second',
      }),
    );
    const second = new TestWebsite(secondAccount, platformContext);

    first.decoratedProps.fileOptions!.fileBatchSize = 99;

    expect(second.decoratedProps.fileOptions?.fileBatchSize).toBe(1);
    expect(TestWebsite.prototype.decoratedProps.fileOptions?.fileBatchSize).toBe(
      1,
    );
  });

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.decoratedProps).not.toBeUndefined();
  });
});

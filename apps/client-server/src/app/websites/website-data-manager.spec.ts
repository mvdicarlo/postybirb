import { Test, TestingModule } from '@nestjs/testing';
import { Account, AccountRepository, clearDatabase, saveFromEntity, WebsiteDataRepository } from '@postybirb/database';
import { WebsiteImplProvider } from './implementations/provider';
import WebsiteDataManager from './website-data-manager';

describe('WebsiteDataManager', () => {
  let module: TestingModule;
  let repository: WebsiteDataRepository;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [WebsiteImplProvider],
    }).compile();
    repository = new WebsiteDataRepository();
    new AccountRepository();
  });

  afterAll(async () => {
    await module.close();
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

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should initialize entity', async () => {
    const account = await populateAccount();
    const manager = new WebsiteDataManager(account);
    // Pre-load
    expect(manager.isInitialized()).toBeFalsy();
    expect(manager.getData()).toEqual({});

    await manager.initialize(repository);
    expect(manager.isInitialized()).toBeTruthy();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('should be able to set new data', async () => {
    const account = await populateAccount();
    const manager = new WebsiteDataManager(account);
    // Pre-load
    expect(manager.isInitialized()).toBeFalsy();
    expect(manager.getData()).toEqual({});

    await manager.initialize(repository);
    expect(manager.isInitialized()).toBeTruthy();

    const obj = { test: 'value' };
    await manager.setData(obj);

    expect(manager.getData()).toEqual(obj);
  });

  it('should be able to clear data', async () => {
    const account = await populateAccount();
    const manager = new WebsiteDataManager(account);
    // Pre-load
    expect(manager.isInitialized()).toBeFalsy();
    expect(manager.getData()).toEqual({});

    await manager.initialize(repository);
    expect(manager.isInitialized()).toBeTruthy();

    const obj = { test: 'value' };
    await manager.setData(obj);
    expect(manager.getData()).toEqual(obj);

    await manager.clearData();
    expect(manager.getData()).toEqual({});
  });

  it('should report successful semantic data changes only', async () => {
    const account = await populateAccount();
    const manager = new WebsiteDataManager(account);
    const onDataChanged = jest.fn();

    await manager.initialize(repository, onDataChanged);
    expect(onDataChanged).not.toHaveBeenCalled();

    const data = { test: 'value' };
    await manager.setData(data);
    expect(onDataChanged).toHaveBeenLastCalledWith(account.id);
    expect(onDataChanged).toHaveBeenCalledTimes(1);

    await manager.setData(data);
    expect(onDataChanged).toHaveBeenCalledTimes(1);

    await manager.clearData();
    expect(onDataChanged).toHaveBeenLastCalledWith(account.id);
    expect(onDataChanged).toHaveBeenCalledTimes(2);
  });

  it('should not report a failed data change', async () => {
    const account = await populateAccount();
    const manager = new WebsiteDataManager(account);
    const onDataChanged = jest.fn();
    await manager.initialize(repository, onDataChanged);
    jest.spyOn(repository, 'update').mockRejectedValueOnce(new Error('failed'));

    await expect(manager.setData({ test: 'value' })).rejects.toThrow('failed');
    expect(onDataChanged).not.toHaveBeenCalled();
    expect(manager.getData()).toEqual({});

    await manager.setData({ test: 'value' });
    expect(manager.getData()).toEqual({ test: 'value' });
    expect(onDataChanged).toHaveBeenCalledWith(account.id);
  });

  it('should not report data deletion during website removal', async () => {
    const account = await populateAccount();
    const manager = new WebsiteDataManager(account);
    const onDataChanged = jest.fn();
    await manager.initialize(repository, onDataChanged);

    await manager.clearData(false);

    expect(onDataChanged).not.toHaveBeenCalled();
  });
});

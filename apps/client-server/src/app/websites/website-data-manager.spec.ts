import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { WebsiteImplProvider } from './implementations/provider';
import WebsiteDataManager from './website-data-manager';

describe('WebsiteDataManager', () => {
  let module: TestingModule;
  let repository: PostyBirbDatabase<'WebsiteDataSchema'>;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [WebsiteImplProvider],
    }).compile();
    repository = new PostyBirbDatabase('WebsiteDataSchema');
  });

  afterAll(async () => {
    await module.close();
  });

  function populateAccount(): Promise<Account> {
    return new Account({
      name: 'test',
      website: 'test',
      groups: [],
      id: 'test',
    }).save();
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
});

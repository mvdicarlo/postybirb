import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SafeObject } from '@postybirb/types';
import { DatabaseModule } from '../database/database.module';
import { Account, WebsiteData } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { WebsiteImplProvider } from './implementations';
import TestWebsite from './implementations/test/test.website';
import WebsiteDataManager from './website-data-manager';

describe('WebsiteDataManager<SafeObject>', () => {
  let module: TestingModule;
  let orm: MikroORM;
  let repository: PostyBirbRepository<WebsiteData<SafeObject>>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [WebsiteImplProvider],
    }).compile();

    repository =
      module.get<PostyBirbRepository<WebsiteData<SafeObject>>>(
        PostyBirbRepository
      );
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
    expect(repository).toBeDefined();
  });

  it('should initialize entity', async () => {
    const account = new Account();

    Object.assign(account, {
      name: 'test',
      id: 'test',
      website: TestWebsite.prototype.metadata.name,
    });

    const manager = new WebsiteDataManager(account);
    // Pre-load
    expect(manager.isInitialized()).toBeFalsy();
    expect(manager.getData()).toEqual({});

    await manager.initialize(repository);
    expect(manager.isInitialized()).toBeTruthy();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('should be able to set new data', async () => {
    const account = new Account();

    Object.assign(account, {
      name: 'test',
      id: 'test',
      website: TestWebsite.prototype.metadata.name,
    });

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
    const account = new Account();

    Object.assign(account, {
      name: 'test',
      id: 'test',
      website: TestWebsite.prototype.metadata.name,
    });

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

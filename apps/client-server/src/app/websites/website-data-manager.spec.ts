import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DynamicObject, NullAccount } from '@postybirb/types';
import { DatabaseModule } from '../database/database.module';
import { WebsiteData } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { WebsiteImplProvider } from './implementations';
import WebsiteDataManager from './website-data-manager';

describe('WebsiteDataManager', () => {
  let module: TestingModule;
  let orm: MikroORM;
  let repository: PostyBirbRepository<WebsiteData<DynamicObject>>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [WebsiteImplProvider],
    }).compile();

    repository =
      module.get<PostyBirbRepository<WebsiteData<DynamicObject>>>(
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
    const account = new NullAccount();
    const manager = new WebsiteDataManager(account);
    // Pre-load
    expect(manager.isInitialized()).toBeFalsy();
    expect(manager.getData()).toEqual({});

    await manager.initialize(repository);
    expect(manager.isInitialized()).toBeTruthy();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('should be able to set new data', async () => {
    const account = new NullAccount();
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
    const account = new NullAccount();
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

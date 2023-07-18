import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';

describe('AccountsService', () => {
  let service: AccountService;
  let registryService: WebsiteRegistryService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [AccountService, WebsiteRegistryService, WebsiteImplProvider],
    }).compile();

    service = module.get<AccountService>(AccountService);
    registryService = module.get<WebsiteRegistryService>(
      WebsiteRegistryService
    );
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }

    await service.onModuleInit();
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await service.create(dto);
    expect(registryService.findInstance(record)).toBeDefined();

    const groups = await service.findAll();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(dto.name);
    expect(groups[0].website).toEqual(dto.website);
    expect(groups[0].groups).toEqual(dto.groups);
    expect(record.toJSON()).toEqual({
      groups: dto.groups,
      name: dto.name,
      website: dto.website,
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      state: {
        isLoggedIn: true,
        pending: false,
        username: 'TestUser',
      },
      data: {
        test: 'test-mode',
      },
      websiteInfo: {
        supports: ['MESSAGE', 'FILE'],
        websiteDisplayName: 'Test',
      },
    });
  });

  it('should support crud operations', async () => {
    const createAccount: CreateAccountDto = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';

    // Create
    const account = await service.create(createAccount);
    expect(account).toBeDefined();
    expect(await service.findAll()).toHaveLength(1);
    expect(await service.findById(account.id)).toBeDefined();

    // Update
    await service.update(account.id, { name: 'Updated', groups: [] });
    expect(await (await service.findById(account.id)).name).toEqual('Updated');

    // Remove
    await service.remove(account.id);
    expect(await service.findAll()).toHaveLength(0);
  });
});

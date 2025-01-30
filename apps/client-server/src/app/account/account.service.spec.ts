import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';

describe('AccountsService', () => {
  let service: AccountService;
  let registryService: WebsiteRegistryService;
  let module: TestingModule;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [AccountService, WebsiteRegistryService, WebsiteImplProvider],
    }).compile();

    service = module.get<AccountService>(AccountService);
    registryService = module.get<WebsiteRegistryService>(
      WebsiteRegistryService,
    );

    await service.onModuleInit();
  });

  afterAll(async () => {
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
    expect(record.toDTO()).toEqual({
      groups: dto.groups,
      name: dto.name,
      website: dto.website,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
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

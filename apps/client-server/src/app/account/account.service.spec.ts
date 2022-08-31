import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import {
  cleanTestDatabase,
  initializeDatabase,
} from '../database/mikroorm.providers';
import { websiteImplementationProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';

describe('AccountsService', () => {
  let service: AccountService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    await initializeDatabase();
  });

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        AccountService,
        WebsiteRegistryService,
        websiteImplementationProvider,
      ],
    }).compile();

    service = testingModule.get<AccountService>(AccountService);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  afterAll(() => {
    cleanTestDatabase();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should support crud operations', async () => {
    const createAccount: CreateAccountDto = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';

    const account = await service.create(createAccount);
    expect(account).toBeDefined();
    expect(await service.findAllAccountDto()).toHaveLength(1);
    expect(await service.findAccountDto(account.id)).toBeDefined();

    await service.update(account.id, { name: 'Updated', groups: [] });
    expect(await (await service.findAccountDto(account.id)).name).toEqual(
      'Updated'
    );

    await service.remove(account.id);
    expect(await service.findAllAccountDto()).toHaveLength(0);
  });

  it('should return login state', async () => {
    const createAccount: CreateAccountDto = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';

    const account = await service.create(createAccount);
    await service.manuallyExecuteOnLogin(account.id);
    expect(await service.findAccountDto(account.id)).toEqual({
      ...account,
      data: {
        test: 'test-mode',
      },
      loginState: {
        isLoggedIn: true,
        pending: false,
        username: 'TestUser',
      },
    });

    await service.clearAccountData(account.id);
    expect(await service.findAccountDto(account.id)).toEqual({
      ...account,
      data: {},
      loginState: {
        isLoggedIn: false,
        pending: false,
        username: null,
      },
    });
  });
});

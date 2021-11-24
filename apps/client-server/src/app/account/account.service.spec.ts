import { Test, TestingModule } from '@nestjs/testing';
import { getRepository, Repository } from 'typeorm';
import { DATABASE_CONNECTION } from '../constants';
import { getTestDatabaseProvider } from '../database/typeorm.providers';
import { WebsiteData } from '../websites/entities/website-data.entity';
import { websiteImplementationProvider } from '../websites/implementations';
import { WebsiteDataProvider } from '../websites/providers/website-data.provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { Account } from './entities/account.entity';
import { AccountProvider } from './providers/account.provider';

describe('AccountsService', () => {
  let service: AccountService;
  let repository: Repository<Account>;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        getTestDatabaseProvider([Account, WebsiteData]),
        AccountProvider,
        AccountService,
        WebsiteDataProvider,
        WebsiteRegistryService,
        websiteImplementationProvider,
      ],
    }).compile();

    service = testingModule.get<AccountService>(AccountService);
    repository = getRepository(Account, DATABASE_CONNECTION);
  });

  afterEach(async () => {
    await repository.manager.connection.close();
    await testingModule.close();
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
    expect(await service.findAll()).toHaveLength(1);
    expect(await service.findOne(account.id)).toBeDefined();

    await service.update(account.id, { name: 'Updated' });
    expect(await (await service.findOne(account.id)).name).toEqual('Updated');

    await service.remove(account.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('should return login state', async () => {
    const createAccount: CreateAccountDto = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';

    const account = await service.create(createAccount);
    await service.manuallyExecuteOnLogin(account.id);
    expect(await service.findOne(account.id)).toEqual({
      data: {
        test: 'test-mode',
      },
      id: account.id,
      loginState: {
        isLoggedIn: true,
        pending: false,
        username: 'TestUser',
      },
      name: 'test',
      website: 'test',
    });

    await service.clearAccountData(account.id);
    expect(await service.findOne(account.id)).toEqual({
      data: {},
      id: account.id,
      loginState: {
        isLoggedIn: false,
        pending: false,
        username: null,
      },
      name: 'test',
      website: 'test',
    });
  });
});

import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../drizzle/postybirb-database/schema-entity-map';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountCommandService } from './account.command.service';
import { ClearAccountDataCommand } from './commands/clear-account-data.command';
import { ClearAccountDataHandler } from './commands/clear-account-data.handler';
import { CreateAccountCommand } from './commands/create-account.command';
import { CreateAccountHandler } from './commands/create-account.handler';
import { DeleteAccountCommand } from './commands/delete-account.command';
import { DeleteAccountHandler } from './commands/delete-account.handler';
import { EmitAccountUpdatesCommand } from './commands/emit-account-updates.command';
import { EmitAccountUpdatesHandler } from './commands/emit-account-updates.handler';
import { SetAccountDataCommand } from './commands/set-account-data.command';
import { SetAccountDataHandler } from './commands/set-account-data.handler';
import { TriggerAccountLoginCommand } from './commands/trigger-account-login.command';
import { TriggerAccountLoginHandler } from './commands/trigger-account-login.handler';
import { UpdateAccountCommand } from './commands/update-account.command';
import { UpdateAccountHandler } from './commands/update-account.handler';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { AccountCreatedEvent } from './events/account-created.event';
import { AccountCreatedHandler } from './events/account-created.handler';
import { GetAccountQuery } from './queries/get-account.query';
import { GetAccountsQuery } from './queries/get-accounts.query';

describe('Account CQRS', () => {
  let commandService: AccountCommandService;
  let createAccountHandler: CreateAccountHandler;
  let updateAccountHandler: UpdateAccountHandler;
  let deleteAccountHandler: DeleteAccountHandler;
  let clearAccountDataHandler: ClearAccountDataHandler;
  let setAccountDataHandler: SetAccountDataHandler;
  let triggerAccountLoginHandler: TriggerAccountLoginHandler;
  let emitAccountUpdatesHandler: EmitAccountUpdatesHandler;
  let accountCreatedHandler: AccountCreatedHandler;

  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;
  let websiteRegistry: WebsiteRegistryService;
  let webSocket: WSGateway;
  let repository: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(async () => {
    clearDatabase();
    repository = new PostyBirbDatabase('AccountSchema');
    let x = DatabaseSchemaEntityMapConst;
    let y = x.AccountSchema;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountCommandService,
        CreateAccountHandler,
        UpdateAccountHandler,
        DeleteAccountHandler,
        ClearAccountDataHandler,
        SetAccountDataHandler,
        TriggerAccountLoginHandler,
        EmitAccountUpdatesHandler,
        AccountCreatedHandler,
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: WebsiteRegistryService,
          useValue: {
            canCreate: jest.fn(),
            create: jest.fn(),
            findInstance: jest.fn(),
            emit: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: WSGateway,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    commandService = module.get<AccountCommandService>(AccountCommandService);
    createAccountHandler =
      module.get<CreateAccountHandler>(CreateAccountHandler);
    updateAccountHandler =
      module.get<UpdateAccountHandler>(UpdateAccountHandler);
    deleteAccountHandler =
      module.get<DeleteAccountHandler>(DeleteAccountHandler);
    clearAccountDataHandler = module.get<ClearAccountDataHandler>(
      ClearAccountDataHandler,
    );
    setAccountDataHandler = module.get<SetAccountDataHandler>(
      SetAccountDataHandler,
    );
    triggerAccountLoginHandler = module.get<TriggerAccountLoginHandler>(
      TriggerAccountLoginHandler,
    );
    emitAccountUpdatesHandler = module.get<EmitAccountUpdatesHandler>(
      EmitAccountUpdatesHandler,
    );
    accountCreatedHandler = module.get<AccountCreatedHandler>(
      AccountCreatedHandler,
    );
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
    eventBus = module.get<EventBus>(EventBus);
    websiteRegistry = module.get<WebsiteRegistryService>(
      WebsiteRegistryService,
    );
    webSocket = module.get<WSGateway>(WSGateway);
  });

  describe('AccountCommandService', () => {
    it('should dispatch CreateAccountCommand', async () => {
      const dto = new CreateAccountDto();
      await commandService.createAccount(dto);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateAccountCommand(dto),
      );
    });

    it('should dispatch UpdateAccountCommand', async () => {
      const dto = new UpdateAccountDto();
      await commandService.updateAccount('test-id', dto);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateAccountCommand('test-id', dto),
      );
    });

    it('should dispatch DeleteAccountCommand', async () => {
      await commandService.deleteAccount('test-id');
      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteAccountCommand('test-id'),
      );
    });

    it('should dispatch TriggerAccountLoginCommand', async () => {
      await commandService.triggerLogin('test-id');
      expect(commandBus.execute).toHaveBeenCalledWith(
        new TriggerAccountLoginCommand('test-id'),
      );
    });

    it('should dispatch ClearAccountDataCommand', async () => {
      await commandService.clearAccountData('test-id');
      expect(commandBus.execute).toHaveBeenCalledWith(
        new ClearAccountDataCommand('test-id'),
      );
    });

    it('should dispatch SetAccountDataCommand', async () => {
      const dto = new SetWebsiteDataRequestDto();
      await commandService.setAccountData(dto);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new SetAccountDataCommand(dto),
      );
    });

    it('should dispatch GetAccountQuery', async () => {
      await commandService.getAccount('test-id');
      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetAccountQuery('test-id'),
      );
    });

    it('should dispatch GetAccountsQuery', async () => {
      await commandService.getAccounts();
      expect(queryBus.execute).toHaveBeenCalledWith(new GetAccountsQuery());
    });
  });

  describe('CreateAccountHandler', () => {
    it('should create account and publish event', async () => {
      const dto = new CreateAccountDto();
      dto.name = 'test';
      dto.website = 'test-website';
      dto.groups = [];

      const websiteInstance = { id: 'test-website' };

      (websiteRegistry.canCreate as jest.Mock).mockReturnValue(true);
      (websiteRegistry.create as jest.Mock).mockResolvedValue(websiteInstance);

      const result = await createAccountHandler.execute(
        new CreateAccountCommand(dto),
      );

      expect(websiteRegistry.canCreate).toHaveBeenCalledWith(dto.website);
      expect(websiteRegistry.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(AccountCreatedEvent),
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const storedAccount = await repository.findById(result.id);
      expect(storedAccount).toBeDefined();
      expect(storedAccount?.name).toBe(dto.name);
    });
  });

  describe('AccountCreatedHandler', () => {
    it('should dispatch TriggerAccountLoginCommand', () => {
      const account = new Account({ id: 'test-id' });
      accountCreatedHandler.handle(new AccountCreatedEvent(account));
      expect(commandBus.execute).toHaveBeenCalledWith(
        new TriggerAccountLoginCommand('test-id'),
      );
    });
  });

  describe('TriggerAccountLoginHandler', () => {
    it('should execute login flow', async () => {
      const account = await repository.insert(
        new Account({
          name: 'test',
          website: 'test',
          groups: [],
        }),
      );

      const websiteInstance = {
        id: 'test-website',
        getLoginState: jest.fn().mockReturnValue({ pending: false }),
        onBeforeLogin: jest.fn(),
        onLogin: jest.fn(),
        onAfterLogin: jest.fn(),
      };

      (websiteRegistry.findInstance as jest.Mock).mockReturnValue(
        websiteInstance,
      );

      await triggerAccountLoginHandler.execute(
        new TriggerAccountLoginCommand(account.id),
      );

      expect(websiteRegistry.findInstance).toHaveBeenCalled();
      expect(websiteInstance.onBeforeLogin).toHaveBeenCalled();
      expect(commandBus.execute).toHaveBeenCalledWith(
        new EmitAccountUpdatesCommand(),
      );
      expect(websiteInstance.onLogin).toHaveBeenCalled();
      expect(websiteInstance.onAfterLogin).toHaveBeenCalled();
      expect(websiteRegistry.emit).toHaveBeenCalled();
    });
  });

  describe('EmitAccountUpdatesHandler', () => {
    it('should emit account updates', async () => {
      const account = await repository.insert(
        new Account({
          name: 'test',
          website: 'test',
          groups: [],
        }),
      );

      const websiteInstance = {
        id: 'test-website',
        getWebsiteData: jest.fn().mockReturnValue({}),
        getLoginState: jest
          .fn()
          .mockReturnValue({ pending: false, isLoggedIn: false, username: '' }),
        decoratedProps: { metadata: { displayName: 'Test Website' } },
        getSupportedTypes: jest.fn().mockReturnValue([]),
      };

      (websiteRegistry.findInstance as jest.Mock).mockReturnValue(
        websiteInstance,
      );

      await emitAccountUpdatesHandler.execute();

      expect(websiteRegistry.findInstance).toHaveBeenCalled();
      expect(webSocket.emit).toHaveBeenCalled();
    });
  });

  describe('UpdateAccountHandler', () => {
    it('should update account and emit updates', async () => {
      const account = await repository.insert(
        new Account({
          name: 'test',
          website: 'test',
          groups: [],
        }),
      );

      const dto = new UpdateAccountDto();
      dto.name = 'updated-name';
      dto.groups = ['updated-group'];

      const websiteInstance = { id: 'test-website' };
      (websiteRegistry.findInstance as jest.Mock).mockReturnValue(
        websiteInstance,
      );

      const result = await updateAccountHandler.execute(
        new UpdateAccountCommand(account.id, dto),
      );

      expect(websiteRegistry.findInstance).toHaveBeenCalled();
      expect(commandBus.execute).toHaveBeenCalledWith(
        new EmitAccountUpdatesCommand(),
      );
      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.groups).toEqual(dto.groups);

      const storedAccount = await repository.findById(account.id);
      expect(storedAccount?.name).toBe(dto.name);
    });
  });

  describe('DeleteAccountHandler', () => {
    it('should delete account and emit updates', async () => {
      const account = await repository.insert(
        new Account({
          name: 'test',
          website: 'test',
          groups: [],
        }),
      );

      await deleteAccountHandler.execute(new DeleteAccountCommand(account.id));

      expect(websiteRegistry.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: account.id }),
      );
      expect(commandBus.execute).toHaveBeenCalledWith(
        new EmitAccountUpdatesCommand(),
      );

      const storedAccount = await repository.findById(account.id);
      expect(storedAccount).toBeNull();
    });
  });

  describe('ClearAccountDataHandler', () => {
    it('should clear account data', async () => {
      const account = await repository.insert(
        new Account({
          name: 'test',
          website: 'test',
          groups: [],
        }),
      );

      const websiteInstance = {
        id: 'test-website',
        clearLoginStateAndData: jest.fn(),
      };

      (websiteRegistry.findInstance as jest.Mock).mockReturnValue(
        websiteInstance,
      );

      await clearAccountDataHandler.execute(
        new ClearAccountDataCommand(account.id),
      );

      expect(websiteRegistry.findInstance).toHaveBeenCalled();
      expect(websiteInstance.clearLoginStateAndData).toHaveBeenCalled();
    });
  });

  describe('SetAccountDataHandler', () => {
    it('should set account data', async () => {
      const account = await repository.insert(
        new Account({
          name: 'test',
          website: 'test',
          groups: [],
        }),
      );

      const dto = new SetWebsiteDataRequestDto();
      dto.id = account.id;
      dto.data = { test: 'data' };

      const websiteInstance = {
        id: 'test-website',
        setWebsiteData: jest.fn(),
      };

      (websiteRegistry.findInstance as jest.Mock).mockReturnValue(
        websiteInstance,
      );

      await setAccountDataHandler.execute(new SetAccountDataCommand(dto));

      expect(websiteRegistry.findInstance).toHaveBeenCalled();
      expect(websiteInstance.setWebsiteData).toHaveBeenCalledWith(dto.data);
    });
  });
});

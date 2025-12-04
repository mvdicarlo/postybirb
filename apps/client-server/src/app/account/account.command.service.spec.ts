import { CommandBus, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../drizzle/postybirb-database/schema-entity-map';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountCommandService } from './account.command.service';
import { CreateAccountCommand } from './commands/create-account.command';
import { CreateAccountHandler } from './commands/create-account.handler';
import { EmitAccountUpdatesCommand } from './commands/emit-account-updates.command';
import { EmitAccountUpdatesHandler } from './commands/emit-account-updates.handler';
import { TriggerAccountLoginCommand } from './commands/trigger-account-login.command';
import { TriggerAccountLoginHandler } from './commands/trigger-account-login.handler';
import { CreateAccountDto } from './dtos/create-account.dto';
import { AccountCreatedEvent } from './events/account-created.event';
import { AccountCreatedHandler } from './events/account-created.handler';

describe('Account CQRS', () => {
  let commandService: AccountCommandService;
  let createAccountHandler: CreateAccountHandler;
  let triggerAccountLoginHandler: TriggerAccountLoginHandler;
  let emitAccountUpdatesHandler: EmitAccountUpdatesHandler;
  let accountCreatedHandler: AccountCreatedHandler;

  let commandBus: CommandBus;
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
});

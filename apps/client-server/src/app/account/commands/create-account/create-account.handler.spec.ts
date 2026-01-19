import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../../../drizzle/postybirb-database/schema-entity-map';
import { CreateAccountDto } from '../../dtos/create-account.dto';
import { AccountCreatedEvent } from '../../events/account-created/account-created.event';
import { CreateAccountCommand } from './create-account.command';
import { CreateAccountHandler } from './create-account.handler';

describe('CreateAccountHandler', () => {
  let handler: CreateAccountHandler;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;
  let repository: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(async () => {
    clearDatabase();
    repository = new PostyBirbDatabase('AccountSchema');
    let x = DatabaseSchemaEntityMapConst;
    let y = x.AccountSchema;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAccountHandler,
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
      ],
    }).compile();

    handler = module.get<CreateAccountHandler>(CreateAccountHandler);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should create account and publish event', async () => {
    const dto = new CreateAccountDto();
    dto.name = 'test';
    dto.website = 'test-website';
    dto.groups = [];

    const websiteInstance = { id: 'test-website' };

    // Mock QueryBus to return true for CanCreateWebsiteQuery
    (queryBus.execute as jest.Mock).mockResolvedValue(true);
    // Mock CommandBus to return websiteInstance for CreateWebsiteInstanceCommand
    (commandBus.execute as jest.Mock).mockResolvedValue(websiteInstance);

    const result = await handler.execute(new CreateAccountCommand(dto));

    expect(queryBus.execute).toHaveBeenCalled();
    expect(commandBus.execute).toHaveBeenCalled();
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

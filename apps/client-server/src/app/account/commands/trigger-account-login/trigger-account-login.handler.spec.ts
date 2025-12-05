import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../../../drizzle/postybirb-database/schema-entity-map';
import { GetWebsiteInstanceQuery } from '../../queries/get-website-instance/get-website-instance.query';
import { EmitAccountUpdatesCommand } from '../emit-account-updates/emit-account-updates.command';
import { TriggerAccountLoginCommand } from './trigger-account-login.command';
import { TriggerAccountLoginHandler } from './trigger-account-login.handler';

describe('TriggerAccountLoginHandler', () => {
  let handler: TriggerAccountLoginHandler;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let repository: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(async () => {
    clearDatabase();
    repository = new PostyBirbDatabase('AccountSchema');
    let x = DatabaseSchemaEntityMapConst;
    let y = x.AccountSchema;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerAccountLoginHandler,
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
      ],
    }).compile();

    handler = module.get<TriggerAccountLoginHandler>(
      TriggerAccountLoginHandler,
    );
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

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

    (queryBus.execute as jest.Mock).mockResolvedValue(websiteInstance);

    await handler.execute(new TriggerAccountLoginCommand(account.id));

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetWebsiteInstanceQuery(expect.objectContaining({ id: account.id })),
    );
    expect(websiteInstance.onBeforeLogin).toHaveBeenCalled();
    expect(commandBus.execute).toHaveBeenCalledWith(
      new EmitAccountUpdatesCommand(),
    );
    expect(websiteInstance.onLogin).toHaveBeenCalled();
    expect(websiteInstance.onAfterLogin).toHaveBeenCalled();
  });
});

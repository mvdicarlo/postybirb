import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../../../drizzle/postybirb-database/schema-entity-map';
import { UpdateAccountDto } from '../../dtos/update-account.dto';
import { GetWebsiteInstanceQuery } from '../../queries/get-website-instance/get-website-instance.query';
import { EmitAccountUpdatesCommand } from '../emit-account-updates/emit-account-updates.command';
import { UpdateAccountCommand } from './update-account.command';
import { UpdateAccountHandler } from './update-account.handler';

describe('UpdateAccountHandler', () => {
  let handler: UpdateAccountHandler;
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
        UpdateAccountHandler,
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

    handler = module.get<UpdateAccountHandler>(UpdateAccountHandler);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

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
    (queryBus.execute as jest.Mock).mockResolvedValue(websiteInstance);

    const result = await handler.execute(
      new UpdateAccountCommand(account.id, dto),
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetWebsiteInstanceQuery(expect.objectContaining({ id: account.id })),
    );
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

import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../../../drizzle/postybirb-database/schema-entity-map';
import { GetWebsiteInstanceQuery } from '../../queries/get-website-instance/get-website-instance.query';
import { ClearAccountDataCommand } from './clear-account-data.command';
import { ClearAccountDataHandler } from './clear-account-data.handler';

describe('ClearAccountDataHandler', () => {
  let handler: ClearAccountDataHandler;
  let queryBus: QueryBus;
  let repository: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(async () => {
    clearDatabase();
    repository = new PostyBirbDatabase('AccountSchema');
    let x = DatabaseSchemaEntityMapConst;
    let y = x.AccountSchema;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearAccountDataHandler,
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ClearAccountDataHandler>(ClearAccountDataHandler);
    queryBus = module.get<QueryBus>(QueryBus);
  });

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

    (queryBus.execute as jest.Mock).mockResolvedValue(websiteInstance);

    await handler.execute(new ClearAccountDataCommand(account.id));

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetWebsiteInstanceQuery(expect.objectContaining({ id: account.id })),
    );
    expect(websiteInstance.clearLoginStateAndData).toHaveBeenCalled();
  });
});

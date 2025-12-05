import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../../../drizzle/postybirb-database/schema-entity-map';
import { SetWebsiteDataRequestDto } from '../../dtos/set-website-data-request.dto';
import { GetWebsiteInstanceQuery } from '../../queries/get-website-instance/get-website-instance.query';
import { SetAccountDataCommand } from './set-account-data.command';
import { SetAccountDataHandler } from './set-account-data.handler';

describe('SetAccountDataHandler', () => {
  let handler: SetAccountDataHandler;
  let queryBus: QueryBus;
  let repository: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(async () => {
    clearDatabase();
    repository = new PostyBirbDatabase('AccountSchema');
    let x = DatabaseSchemaEntityMapConst;
    let y = x.AccountSchema;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetAccountDataHandler,
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<SetAccountDataHandler>(SetAccountDataHandler);
    queryBus = module.get<QueryBus>(QueryBus);
  });

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

    (queryBus.execute as jest.Mock).mockResolvedValue(websiteInstance);

    await handler.execute(new SetAccountDataCommand(dto));

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetWebsiteInstanceQuery(expect.objectContaining({ id: account.id })),
    );
    expect(websiteInstance.setWebsiteData).toHaveBeenCalledWith(dto.data);
  });
});

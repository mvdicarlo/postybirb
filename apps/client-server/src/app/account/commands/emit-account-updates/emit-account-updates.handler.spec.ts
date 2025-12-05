import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { Account } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { DatabaseSchemaEntityMapConst } from '../../../drizzle/postybirb-database/schema-entity-map';
import { WSGateway } from '../../../web-socket/web-socket-gateway';
import { GetWebsiteInstanceQuery } from '../../queries/get-website-instance/get-website-instance.query';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';
import { EmitAccountUpdatesHandler } from './emit-account-updates.handler';

describe('EmitAccountUpdatesHandler', () => {
  let handler: EmitAccountUpdatesHandler;
  let queryBus: QueryBus;
  let webSocket: WSGateway;
  let repository: PostyBirbDatabase<'AccountSchema'>;

  beforeEach(async () => {
    clearDatabase();
    repository = new PostyBirbDatabase('AccountSchema');
    let x = DatabaseSchemaEntityMapConst;
    let y = x.AccountSchema;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmitAccountUpdatesHandler,
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
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

    handler = module.get<EmitAccountUpdatesHandler>(EmitAccountUpdatesHandler);
    queryBus = module.get<QueryBus>(QueryBus);
    webSocket = module.get<WSGateway>(WSGateway);
  });

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

    (queryBus.execute as jest.Mock).mockResolvedValue(websiteInstance);

    await handler.execute(new EmitAccountUpdatesCommand());

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetWebsiteInstanceQuery(expect.objectContaining({ id: account.id })),
    );
    expect(webSocket.emit).toHaveBeenCalled();
  });
});

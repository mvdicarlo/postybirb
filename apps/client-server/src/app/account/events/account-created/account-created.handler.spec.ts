import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Account } from '../../../drizzle/models';
import { TriggerAccountLoginCommand } from '../../commands/trigger-account-login/trigger-account-login.command';
import { AccountCreatedEvent } from './account-created.event';
import { AccountCreatedHandler } from './account-created.handler';

describe('AccountCreatedHandler', () => {
  let handler: AccountCreatedHandler;
  let commandBus: CommandBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountCreatedHandler,
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<AccountCreatedHandler>(AccountCreatedHandler);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  it('should dispatch TriggerAccountLoginCommand', () => {
    const account = new Account({ id: 'test-id' });
    handler.handle(new AccountCreatedEvent(account));
    expect(commandBus.execute).toHaveBeenCalledWith(
      new TriggerAccountLoginCommand('test-id'),
    );
  });
});

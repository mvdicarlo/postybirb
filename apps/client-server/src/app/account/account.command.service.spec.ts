import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountCommandService } from './account.command.service';
import { ClearAccountDataCommand } from './commands/clear-account-data/clear-account-data.command';
import { CreateAccountCommand } from './commands/create-account/create-account.command';
import { DeleteAccountCommand } from './commands/delete-account/delete-account.command';
import { SetAccountDataCommand } from './commands/set-account-data/set-account-data.command';
import { TriggerAccountLoginCommand } from './commands/trigger-account-login/trigger-account-login.command';
import { UpdateAccountCommand } from './commands/update-account/update-account.command';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { GetAccountQuery } from './queries/get-account/get-account.query';
import { GetAccountsQuery } from './queries/get-accounts/get-accounts.query';

describe('AccountCommandService', () => {
  let service: AccountCommandService;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountCommandService,
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

    service = module.get<AccountCommandService>(AccountCommandService);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should dispatch CreateAccountCommand', async () => {
    const dto = new CreateAccountDto();
    await service.createAccount(dto);
    expect(commandBus.execute).toHaveBeenCalledWith(
      new CreateAccountCommand(dto),
    );
  });

  it('should dispatch UpdateAccountCommand', async () => {
    const dto = new UpdateAccountDto();
    await service.updateAccount('test-id', dto);
    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateAccountCommand('test-id', dto),
    );
  });

  it('should dispatch DeleteAccountCommand', async () => {
    await service.deleteAccount('test-id');
    expect(commandBus.execute).toHaveBeenCalledWith(
      new DeleteAccountCommand('test-id'),
    );
  });

  it('should dispatch TriggerAccountLoginCommand', async () => {
    await service.triggerLogin('test-id');
    expect(commandBus.execute).toHaveBeenCalledWith(
      new TriggerAccountLoginCommand('test-id'),
    );
  });

  it('should dispatch ClearAccountDataCommand', async () => {
    await service.clearAccountData('test-id');
    expect(commandBus.execute).toHaveBeenCalledWith(
      new ClearAccountDataCommand('test-id'),
    );
  });

  it('should dispatch SetAccountDataCommand', async () => {
    const dto = new SetWebsiteDataRequestDto();
    await service.setAccountData(dto);
    expect(commandBus.execute).toHaveBeenCalledWith(
      new SetAccountDataCommand(dto),
    );
  });

  it('should dispatch GetAccountQuery', async () => {
    await service.getAccount('test-id');
    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetAccountQuery('test-id'),
    );
  });

  it('should dispatch GetAccountsQuery', async () => {
    await service.getAccounts();
    expect(queryBus.execute).toHaveBeenCalledWith(new GetAccountsQuery());
  });
});


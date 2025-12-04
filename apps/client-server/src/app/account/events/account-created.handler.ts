import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { TriggerAccountLoginCommand } from '../commands/trigger-account-login.command';
import { AccountCreatedEvent } from './account-created.event';

@EventsHandler(AccountCreatedEvent)
export class AccountCreatedHandler
  implements IEventHandler<AccountCreatedEvent>
{
  private readonly logger = Logger(AccountCreatedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  handle(event: AccountCreatedEvent) {
    this.logger.info(`Account created: ${event.account.id}`);
    this.commandBus.execute(new TriggerAccountLoginCommand(event.account.id));
  }
}

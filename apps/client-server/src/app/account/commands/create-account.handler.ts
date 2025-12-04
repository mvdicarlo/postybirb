import { BadRequestException } from '@nestjs/common';
import {
    CommandBus,
    CommandHandler,
    EventBus,
    ICommandHandler,
    QueryBus,
} from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { Account } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { AccountCreatedEvent } from '../events/account-created.event';
import { CanCreateWebsiteQuery } from '../queries/can-create-website.query';
import { CreateAccountCommand } from './create-account.command';
import { CreateWebsiteInstanceCommand } from './create-website-instance.command';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler
  implements ICommandHandler<CreateAccountCommand>
{
  private readonly logger = Logger(CreateAccountHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateAccountCommand): Promise<Account> {
    const { createAccountDto } = command;
    this.logger
      .withMetadata(createAccountDto)
      .info(
        `Creating Account '${createAccountDto.name}:${createAccountDto.website}'`,
      );

    const canCreate = await this.queryBus.execute(
      new CanCreateWebsiteQuery(createAccountDto.website),
    );
    if (!canCreate) {
      throw new BadRequestException(
        `Website ${createAccountDto.website} is not supported.`,
      );
    }

    const account = await this.repository.insert(new Account(createAccountDto));
    const instance = await this.commandBus.execute(
      new CreateWebsiteInstanceCommand(account),
    );

    this.eventBus.publish(new AccountCreatedEvent(account));

    return account.withWebsiteInstance(instance);
  }
}

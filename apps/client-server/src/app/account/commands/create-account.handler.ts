import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { Account } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { AccountCreatedEvent } from '../events/account-created.event';
import { CreateAccountCommand } from './create-account.command';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler
  implements ICommandHandler<CreateAccountCommand>
{
  private readonly logger = Logger(CreateAccountHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateAccountCommand): Promise<Account> {
    const { createAccountDto } = command;
    this.logger
      .withMetadata(createAccountDto)
      .info(
        `Creating Account '${createAccountDto.name}:${createAccountDto.website}'`,
      );

    if (!this.websiteRegistry.canCreate(createAccountDto.website)) {
      throw new BadRequestException(
        `Website ${createAccountDto.website} is not supported.`,
      );
    }

    const account = await this.repository.insert(new Account(createAccountDto));
    const instance = await this.websiteRegistry.create(account);

    this.eventBus.publish(new AccountCreatedEvent(account));

    return account.withWebsiteInstance(instance);
  }
}

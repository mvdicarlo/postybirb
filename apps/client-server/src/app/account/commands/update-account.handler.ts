import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { Account } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';
import { UpdateAccountCommand } from './update-account.command';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler
  implements ICommandHandler<UpdateAccountCommand>
{
  private readonly logger = Logger(UpdateAccountHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: UpdateAccountCommand): Promise<Account> {
    const { id, updateAccountDto } = command;
    this.logger.withMetadata(updateAccountDto).info(`Updating Account '${id}'`);

    const account = await this.repository.update(id, updateAccountDto);
    const instance = this.websiteRegistry.findInstance(account);

    await this.commandBus.execute(new EmitAccountUpdatesCommand());

    return account.withWebsiteInstance(instance);
  }
}

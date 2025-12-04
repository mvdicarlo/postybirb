import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { DeleteAccountCommand } from './delete-account.command';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler
  implements ICommandHandler<DeleteAccountCommand>
{
  private readonly logger = Logger(DeleteAccountHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<void> {
    const { id } = command;
    this.logger.info(`Deleting Account '${id}'`);

    const account = await this.repository.findById(id);
    if (account) {
      this.websiteRegistry.remove(account);
      await this.repository.deleteById([id]);
      await this.commandBus.execute(new EmitAccountUpdatesCommand());
    }
  }
}

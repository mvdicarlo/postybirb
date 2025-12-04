import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { DeleteAccountCommand } from './delete-account.command';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';
import { RemoveWebsiteInstanceCommand } from './remove-website-instance.command';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler
  implements ICommandHandler<DeleteAccountCommand>
{
  private readonly logger = Logger(DeleteAccountHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: DeleteAccountCommand): Promise<void> {
    const { id } = command;
    this.logger.info(`Deleting Account '${id}'`);

    const account = await this.repository.findById(id);
    if (account) {
      await this.commandBus.execute(
        new RemoveWebsiteInstanceCommand(account),
      );
      await this.repository.deleteById([id]);
      await this.commandBus.execute(new EmitAccountUpdatesCommand());
    }
  }
}

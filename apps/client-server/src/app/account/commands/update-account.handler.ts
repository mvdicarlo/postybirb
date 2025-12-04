import {
    CommandBus,
    CommandHandler,
    ICommandHandler,
    QueryBus,
} from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { Account } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { GetWebsiteInstanceQuery } from '../queries/get-website-instance.query';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';
import { UpdateAccountCommand } from './update-account.command';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler
  implements ICommandHandler<UpdateAccountCommand>
{
  private readonly logger = Logger(UpdateAccountHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: UpdateAccountCommand): Promise<Account> {
    const { id, updateAccountDto } = command;
    this.logger.withMetadata(updateAccountDto).info(`Updating Account '${id}'`);

    const account = await this.repository.update(id, updateAccountDto);
    const instance = await this.queryBus.execute(
      new GetWebsiteInstanceQuery(account),
    );

    await this.commandBus.execute(new EmitAccountUpdatesCommand());

    return account.withWebsiteInstance(instance);
  }
}

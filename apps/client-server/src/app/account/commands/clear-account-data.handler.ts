import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { GetWebsiteInstanceQuery } from '../queries/get-website-instance.query';
import { ClearAccountDataCommand } from './clear-account-data.command';

@CommandHandler(ClearAccountDataCommand)
export class ClearAccountDataHandler
  implements ICommandHandler<ClearAccountDataCommand>
{
  private readonly logger = Logger(ClearAccountDataHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(private readonly queryBus: QueryBus) {}

  async execute(command: ClearAccountDataCommand): Promise<void> {
    const { id } = command;
    this.logger.info(`Clearing Account data for '${id}'`);
    const account = await this.repository.findById(id);
    if (account) {
      const instance = await this.queryBus.execute(
        new GetWebsiteInstanceQuery(account),
      );
      await instance.clearLoginStateAndData();
    }
  }
}

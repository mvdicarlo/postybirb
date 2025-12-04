import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { GetWebsiteInstanceQuery } from '../queries/get-website-instance.query';
import { SetAccountDataCommand } from './set-account-data.command';

@CommandHandler(SetAccountDataCommand)
export class SetAccountDataHandler
  implements ICommandHandler<SetAccountDataCommand>
{
  private readonly logger = Logger(SetAccountDataHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(private readonly queryBus: QueryBus) {}

  async execute(command: SetAccountDataCommand): Promise<void> {
    const { dto } = command;
    this.logger.info(`Setting Account data for '${dto.id}'`);
    const account = await this.repository.findById(dto.id, {
      failOnMissing: true,
    });
    const instance = await this.queryBus.execute(
      new GetWebsiteInstanceQuery(account),
    );
    await instance.setWebsiteData(dto.data);
  }
}

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { ClearAccountDataCommand } from './clear-account-data.command';

@CommandHandler(ClearAccountDataCommand)
export class ClearAccountDataHandler
  implements ICommandHandler<ClearAccountDataCommand>
{
  private readonly logger = Logger(ClearAccountDataHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(command: ClearAccountDataCommand): Promise<void> {
    const { id } = command;
    this.logger.info(`Clearing Account data for '${id}'`);
    const account = await this.repository.findById(id);
    if (account) {
      const instance = this.websiteRegistry.findInstance(account);
      await instance.clearLoginStateAndData();
    }
  }
}

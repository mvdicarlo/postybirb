import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { SetAccountDataCommand } from './set-account-data.command';

@CommandHandler(SetAccountDataCommand)
export class SetAccountDataHandler
  implements ICommandHandler<SetAccountDataCommand>
{
  private readonly logger = Logger(SetAccountDataHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(private readonly websiteRegistry: WebsiteRegistryService) {}

  async execute(command: SetAccountDataCommand): Promise<void> {
    const { dto } = command;
    this.logger.info(`Setting Account data for '${dto.id}'`);
    const account = await this.repository.findById(dto.id, {
      failOnMissing: true,
    });
    const instance = this.websiteRegistry.findInstance(account);
    await instance.setWebsiteData(dto.data);
  }
}

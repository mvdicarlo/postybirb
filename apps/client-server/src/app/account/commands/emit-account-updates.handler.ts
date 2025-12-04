import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { NULL_ACCOUNT_ID } from '@postybirb/types';
import { ne } from 'drizzle-orm';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';

@CommandHandler(EmitAccountUpdatesCommand)
export class EmitAccountUpdatesHandler
  implements ICommandHandler<EmitAccountUpdatesCommand>
{
  private readonly logger = Logger(EmitAccountUpdatesHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly webSocket: WSGateway,
  ) {}

  async execute(): Promise<void> {
    try {
      const accounts = await this.repository.find({
        where: ne(this.repository.schemaEntity.id, NULL_ACCOUNT_ID),
      });

      const dtos = accounts.map((account) => {
        const instance = this.websiteRegistry.findInstance(account);
        return account.withWebsiteInstance(instance).toDTO();
      });

      this.webSocket.emit({
        event: ACCOUNT_UPDATES,
        data: dtos,
      });
    } catch (err) {
      this.logger.error(err, 'Failed to emit account updates');
    }
  }
}

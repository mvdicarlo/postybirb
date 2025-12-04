import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { NULL_ACCOUNT_ID } from '@postybirb/types';
import { ne } from 'drizzle-orm';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { WSGateway } from '../../../web-socket/web-socket-gateway';
import { GetWebsiteInstanceQuery } from '../../queries/get-website-instance/get-website-instance.query';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';

@CommandHandler(EmitAccountUpdatesCommand)
export class EmitAccountUpdatesHandler
  implements ICommandHandler<EmitAccountUpdatesCommand>
{
  private readonly logger = Logger(EmitAccountUpdatesHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly queryBus: QueryBus,
    private readonly webSocket: WSGateway,
  ) {}

  async execute(): Promise<void> {
    try {
      const accounts = await this.repository.find({
        where: ne(this.repository.schemaEntity.id, NULL_ACCOUNT_ID),
      });

      const dtos = await Promise.all(
        accounts.map(async (account) => {
          const instance = await this.queryBus.execute(
            new GetWebsiteInstanceQuery(account),
          );
          return account.withWebsiteInstance(instance).toDTO();
        }),
      );

      this.webSocket.emit({
        event: ACCOUNT_UPDATES,
        data: dtos,
      });
    } catch (err) {
      this.logger.error(err, 'Failed to emit account updates');
    }
  }
}

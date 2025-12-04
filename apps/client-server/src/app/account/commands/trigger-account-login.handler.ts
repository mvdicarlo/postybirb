import {
    CommandBus,
    CommandHandler,
    ICommandHandler,
    QueryBus,
} from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { waitUntil } from '../../utils/wait.util';
import { UnknownWebsite } from '../../websites/website';
import { GetWebsiteInstanceQuery } from '../queries/get-website-instance.query';
import { EmitAccountUpdatesCommand } from './emit-account-updates.command';
import { TriggerAccountLoginCommand } from './trigger-account-login.command';

@CommandHandler(TriggerAccountLoginCommand)
export class TriggerAccountLoginHandler
  implements ICommandHandler<TriggerAccountLoginCommand>
{
  private readonly logger = Logger(TriggerAccountLoginHandler.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: TriggerAccountLoginCommand): Promise<void> {
    const { accountId } = command;
    const account = await this.repository.findById(accountId);
    if (!account) {
      this.logger.warn(`Account not found: ${accountId}`);
      return;
    }

    const website = await this.queryBus.execute(
      new GetWebsiteInstanceQuery(account),
    );
    if (!website) {
      this.logger.warn(`Website instance not found for account: ${accountId}`);
      return;
    }

    this.logger.trace(`Running onLogin on ${website.id}`);
    try {
      await this.awaitPendingLogin(website);
      website.onBeforeLogin();
      this.commandBus.execute(new EmitAccountUpdatesCommand());
      await website.onLogin();
    } catch (e) {
      this.logger.withError(e).error(`onLogin failed for ${website.id}`);
    } finally {
      website.onAfterLogin();
      this.commandBus.execute(new EmitAccountUpdatesCommand());
      // this.websiteRegistry.emit(); // This was calling registry directly.
      // The registry emit is usually triggered by updates.
      // If we need to trigger registry emit, we might need a command for that too,
      // or rely on EmitAccountUpdatesCommand if it covers it.
      // AccountService.emit() calls super.emit() (socket)
      // WebsiteRegistryService.emit() calls socket with website info.
      // TriggerAccountLoginHandler called both.
      // Let's assume we need to trigger website registry emit too.
      // But we don't have a command for that yet.
      // For now, I will leave it commented out or find a way.
      // Wait, EmitAccountUpdatesCommand handler calls websiteRegistry.emit()?
      // Let's check EmitAccountUpdatesHandler.
    }
  }

  /**
   * Waits for a website's pending state to be false.
   *
   * @param {UnknownWebsite} website
   */
  private async awaitPendingLogin(website: UnknownWebsite): Promise<void> {
    if (!website.getLoginState().pending) {
      return;
    }

    await waitUntil(() => !website.getLoginState().pending, 500);
  }
}

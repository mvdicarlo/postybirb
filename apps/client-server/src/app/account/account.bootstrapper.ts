import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@postybirb/logger';
import {
    IWebsiteMetadata,
    NULL_ACCOUNT_ID,
    NullAccount,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { DeleteAccountCommand } from './commands/delete-account/delete-account.command';
import { EmitAccountUpdatesCommand } from './commands/emit-account-updates/emit-account-updates.command';
import { TriggerAccountLoginCommand } from './commands/trigger-account-login/trigger-account-login.command';
import { GetAccountsQuery } from './queries/get-accounts/get-accounts.query';

@Injectable()
export class AccountBootstrapper implements OnModuleInit {
  private readonly logger = Logger(AccountBootstrapper.name);

  private readonly repository = new PostyBirbDatabase('AccountSchema');

  private readonly loginRefreshTimers: Record<
    string,
    {
      timer: NodeJS.Timeout;
      websites: Class<UnknownWebsite>[];
    }
  > = {};

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    this.repository.subscribe('AccountSchema', () => this.emit());
  }

  /**
   * Initializes all website login timers and creates instances for known accounts.
   * Heavy operations are deferred to avoid blocking application startup.
   */
  async onModuleInit() {
    // Critical path: only populate null account to ensure database is ready
    await this.populateNullAccount();

    // Defer heavy operations to avoid blocking NestJS initialization
    setImmediate(async () => {
      await this.deleteUnregisteredAccounts();
      await this.initWebsiteRegistry();
      this.initWebsiteLoginRefreshTimers();

      this.emit();

      Object.keys(this.loginRefreshTimers).forEach((interval) =>
        this.executeOnLoginForInterval(interval),
      );
    });
  }

  private async deleteUnregisteredAccounts() {
    const accounts = await this.queryBus.execute(new GetAccountsQuery());
    const unregisteredAccounts = accounts.filter(
      (account) => !this.websiteRegistry.canCreate(account.website),
    );
    for (const account of unregisteredAccounts) {
      try {
        this.logger
          .withMetadata(account)
          .warn(
            `Deleting unregistered account: ${account.id} (${account.name})`,
          );
        await this.commandBus.execute(new DeleteAccountCommand(account.id));
      } catch (err) {
        this.logger
          .withError(err)
          .withMetadata(account)
          .error(`Failed to delete unregistered account: ${account.id}`);
      }
    }
  }

  /**
   * Create the Nullable typed account.
   */
  private async populateNullAccount(): Promise<void> {
    if (!(await this.repository.findById(NULL_ACCOUNT_ID))) {
      await this.repository.insert(new NullAccount());
    }
  }

  /**
   * Loads accounts into website registry.
   */
  private async initWebsiteRegistry(): Promise<void> {
    const accounts = await this.queryBus.execute(new GetAccountsQuery());
    await Promise.all(
      accounts.map((account) => this.websiteRegistry.create(account)),
    ).catch((err) => {
      this.logger.error(err, 'onModuleInit');
    });
  }

  /**
   * Creates website login check timers.
   */
  private initWebsiteLoginRefreshTimers(): void {
    const availableWebsites = this.websiteRegistry.getAvailableWebsites();
    availableWebsites.forEach((website) => {
      const interval: number =
        (website.prototype.decoratedProps.metadata as IWebsiteMetadata)
          .refreshInterval ?? 60_000 * 60;
      if (!this.loginRefreshTimers[interval]) {
        this.loginRefreshTimers[interval] = {
          websites: [],
          timer: setInterval(() => {
            this.executeOnLoginForInterval(interval);
          }, interval),
        };
      }

      this.loginRefreshTimers[interval].websites.push(website);
    });
  }

  public async emit() {
    this.commandBus.execute(new EmitAccountUpdatesCommand());
  }

  /**
   * Runs onLogin on all created website instances within a specific interval
   * and updates website login state.
   *
   * @param {string} interval
   */
  private async executeOnLoginForInterval(interval: string | number) {
    const { websites } = this.loginRefreshTimers[interval];
    websites.forEach((website) => {
      this.websiteRegistry.getInstancesOf(website).forEach((instance) => {
        this.commandBus.execute(
          new TriggerAccountLoginCommand(instance.accountId),
        );
      });
    });
  }
}

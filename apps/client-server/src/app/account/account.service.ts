import {
    BadRequestException,
    Injectable,
    OnModuleInit,
    Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import {
    AccountId,
    IWebsiteMetadata,
    NULL_ACCOUNT_ID,
    NullAccount,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { ne } from 'drizzle-orm';
import { Class } from 'type-fest';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Account } from '../drizzle/models';
import { FindOptions } from '../drizzle/postybirb-database/find-options.type';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { LoginStatePoller } from './login-state-poller';

/**
 * Service responsible for returning Account data.
 * Also stores login refresh timers for initiating login checks.
 */
@Injectable()
export class AccountService
  extends PostyBirbService<'AccountSchema'>
  implements OnModuleInit
{
  private readonly loginRefreshTimers: Record<
    string,
    {
      timer: NodeJS.Timeout;
      websites: Class<UnknownWebsite>[];
    }
  > = {};

  private readonly loginStatePoller: LoginStatePoller;

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('AccountSchema', webSocket);
    this.repository.subscribe('AccountSchema', () => this.emit());
    this.loginStatePoller = new LoginStatePoller(
      this.websiteRegistry,
      () => {
        this.emit();
        this.websiteRegistry.emit();
      },
    );
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
      this.websiteRegistry.markAsInitialized();
      this.initWebsiteLoginRefreshTimers();

      this.emit();

      Object.keys(this.loginRefreshTimers).forEach((interval) =>
        this.executeOnLoginForInterval(interval),
      );
    });
  }

  /**
   * CRON-driven poll for login state changes.
   * Compares cached login states against live values and emits to UI on change.
   */
  @Cron(CronExpression.EVERY_SECOND)
  private pollLoginStates() {
    if (!IsTestEnvironment()) {
      this.loginStatePoller.checkForChanges();
    }
  }

  private async deleteUnregisteredAccounts() {
    const accounts = await this.repository.find({
      where: ne(this.repository.schemaEntity.id, NULL_ACCOUNT_ID),
    });
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
        await this.repository.deleteById([account.id]);
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
    const accounts = await this.repository.find({
      where: ne(this.repository.schemaEntity.id, NULL_ACCOUNT_ID),
    });
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
    const dtos = await this.findAll().then((accounts) =>
      accounts.map((a) => this.injectWebsiteInstance(a)),
    );
    super.emit({
      event: ACCOUNT_UPDATES,
      data: dtos.map((dto) => dto.toDTO()),
    });
  }

  /**
   * Runs login on all created website instances within a specific interval.
   * The mutex inside website.login() ensures only one login runs at a time
   * per instance; concurrent callers simply wait and get the fresh state.
   *
   * @param {string} interval
   */
  private async executeOnLoginForInterval(interval: string | number) {
    const { websites } = this.loginRefreshTimers[interval];
    websites.forEach((website) => {
      this.websiteRegistry.getInstancesOf(website).forEach((instance) => {
        // Fire-and-forget — the poller will detect state changes
        instance.login().catch((e) => {
          this.logger.withError(e).error(`Login failed for ${instance.id}`);
        });
      });
    });
  }

  /**
   * Logic that needs to be run after an account is created.
   *
   * @param {Account} account
   * @param {UnknownWebsite} website
   */
  private afterCreate(account: Account, website: UnknownWebsite) {
    // Fire-and-forget — poller picks up the state change
    website.login().catch((e) => {
      this.logger.withError(e).error(`Initial login failed for ${website.id}`);
    });
  }

  /**
   * Ensures a website instance is registered for an account that already
   * exists in the database (e.g. from a legacy import). Creates the instance
   * if it doesn't already exist, then triggers login.
   *
   * @param {AccountId} id
   */
  async registerAndLogin(id: AccountId): Promise<void> {
    const account = await this.repository.findById(id);
    if (!account || account.id === NULL_ACCOUNT_ID) {
      return;
    }

    let instance = this.websiteRegistry.findInstance(account);
    if (!instance) {
      if (!this.websiteRegistry.canCreate(account.website)) {
        this.logger.warn(
          `Cannot create website instance for ${account.website} (account: ${account.id})`,
        );
        return;
      }
      instance = await this.websiteRegistry.create(account);
    }

    instance.login().catch((e) => {
      this.logger.withError(e).error(`Login failed for ${instance.id}`);
    });
  }

  /**
   * Executes a login refresh initiated from an external source.
   * Waits for the result so the caller knows when it's done.
   *
   * @param {AccountId} id
   */
  async manuallyExecuteOnLogin(id: AccountId): Promise<void> {
    const account = await this.findById(id);
    if (account) {
      const instance = this.websiteRegistry.findInstance(account);
      if (instance) {
        await instance.login();
        // Force an immediate UI update for this instance
        this.loginStatePoller.checkInstance(instance);
      }
    }
  }

  /**
   * Creates an Account.
   * @param {CreateAccountDto} createDto
   * @return {*}  {Promise<Account>}
   */
  async create(createDto: CreateAccountDto): Promise<Account> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating Account '${createDto.name}:${createDto.website}`);
    if (!this.websiteRegistry.canCreate(createDto.website)) {
      throw new BadRequestException(
        `Website ${createDto.website} is not supported.`,
      );
    }
    const account = await this.repository.insert(new Account(createDto));
    const instance = await this.websiteRegistry.create(account);
    this.afterCreate(account, instance);
    return account.withWebsiteInstance(instance);
  }

  public findById(id: AccountId, options?: FindOptions) {
    return this.repository
      .findById(id, options)
      .then((account) => this.injectWebsiteInstance(account));
  }

  public async findAll() {
    return this.repository
      .find({
        where: ne(this.repository.schemaEntity.id, NULL_ACCOUNT_ID),
      })
      .then((accounts) =>
        accounts.map((account) => this.injectWebsiteInstance(account)),
      );
  }

  async update(id: AccountId, update: UpdateAccountDto) {
    this.logger.withMetadata(update).info(`Updating Account '${id}'`);
    return this.repository
      .update(id, update)
      .then((account) => this.injectWebsiteInstance(account));
  }

  async remove(id: AccountId) {
    const account = await this.findById(id);
    if (account) {
      this.websiteRegistry.remove(account);
    }
    return super.remove(id);
  }

  /**
   * Clears the data and login state associated with an account.
   *
   * @param {string} id
   */
  async clearAccountData(id: AccountId) {
    this.logger.info(`Clearing Account data for '${id}'`);
    const account = await this.findById(id);
    if (account) {
      const instance = this.websiteRegistry.findInstance(account);
      await instance.clearLoginStateAndData();
    }
  }

  /**
   * Sets the data saved to an account's website.
   *
   * @param {SetWebsiteDataRequestDto} setWebsiteDataRequestDto
   */
  async setAccountData(setWebsiteDataRequestDto: SetWebsiteDataRequestDto) {
    this.logger.info(
      `Setting Account data for '${setWebsiteDataRequestDto.id}'`,
    );
    const account = await this.repository.findById(
      setWebsiteDataRequestDto.id,
      { failOnMissing: true },
    );
    const instance = this.websiteRegistry.findInstance(account);
    await instance.setWebsiteData(setWebsiteDataRequestDto.data);
  }

  private injectWebsiteInstance(account?: Account): Account | null {
    if (!account) {
      return null;
    }
    return account.withWebsiteInstance(
      this.websiteRegistry.findInstance(account),
    );
  }
}

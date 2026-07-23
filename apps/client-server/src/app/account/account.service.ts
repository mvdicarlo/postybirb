import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Account, AccountRepository } from '@postybirb/database';
import {
  AccountId,
  IAccountDto,
  IWebsiteMetadata,
  NULL_ACCOUNT_ID,
  NullAccount,
} from '@postybirb/types';
import { ne } from 'drizzle-orm';
import { Class } from 'type-fest';
import { PostyBirbService } from '../common/service/postybirb-service';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { publishAccountRemoved } from './account.events';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';

/**
 * Service responsible for returning Account data.
 * Also stores login refresh timers for initiating login checks.
 */
@Injectable()
export class AccountService
  extends PostyBirbService<AccountRepository>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly loginRefreshTimers: Record<
    string,
    {
      timer: NodeJS.Timeout;
      websites: Class<UnknownWebsite>[];
    }
  > = {};

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {
    super(new AccountRepository());
  }

  onModuleDestroy(): void {
    Object.values(this.loginRefreshTimers).forEach(({ timer }) => {
      clearInterval(timer);
    });
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
      try {
        await this.deleteUnregisteredAccounts();
        await this.initWebsiteRegistry();
        this.initWebsiteLoginRefreshTimers();

        Object.keys(this.loginRefreshTimers).forEach((interval) =>
          this.executeOnLoginForInterval(interval),
        );
      } catch (error) {
        this.logger.withError(error).error('Failed to initialize Accounts');
      } finally {
        this.websiteRegistry.markAsInitialized();
      }
    });
  }

  private async deleteUnregisteredAccounts() {
    const accounts = await this.repository.find({
      where: ne(this.table.id, NULL_ACCOUNT_ID),
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
        const result = await this.repository.deleteById([account.id]);
        if (result.changes > 0) {
          publishAccountRemoved(this.eventEmitter, account.id);
        }
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
      where: ne(this.table.id, NULL_ACCOUNT_ID),
    });
    const results = await Promise.allSettled(
      accounts.map((account) => this.websiteRegistry.ensureInstance(account)),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger
          .withError(result.reason)
          .error(`Failed to initialize Account '${accounts[index].id}'`);
      }
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
    let instance: UnknownWebsite;
    try {
      instance = await this.websiteRegistry.create(account);
    } catch (error) {
      try {
        await this.repository.deleteById([account.id]);
      } catch (rollbackError) {
        this.logger
          .withError(rollbackError)
          .error(`Failed to roll back Account '${account.id}'`);
      }
      throw error;
    }
    this.afterCreate(account, instance);
    return account;
  }

  public async findById(id: AccountId): Promise<Account | null> {
    return this.repository.findById(id);
  }

  public async findByIdOrThrow(id: AccountId): Promise<Account> {
    return this.repository.findByIdOrThrow(id);
  }

  public async findAll() {
    const accounts = await this.repository.find({
      where: ne(this.table.id, NULL_ACCOUNT_ID),
    });
    return accounts;
  }

  async findDtoByIdOrThrow(id: AccountId): Promise<IAccountDto> {
    await this.websiteRegistry.waitForInitialization(60_000);
    const account = await this.repository.findByIdOrThrow(id);
    return (await this.websiteRegistry.ensureInstance(account)).toAccountDto();
  }

  async findAllDtos(): Promise<IAccountDto[]> {
    await this.websiteRegistry.waitForInitialization(60_000);
    return Promise.all(
      (await this.findAll()).map(async (account) =>
        (await this.websiteRegistry.ensureInstance(account)).toAccountDto(),
      ),
    );
  }

  async createDto(createDto: CreateAccountDto): Promise<IAccountDto> {
    const account = await this.create(createDto);
    return this.websiteRegistry.getAccountDto(account);
  }

  async update(id: AccountId, update: UpdateAccountDto) {
    this.logger.withMetadata(update).info(`Updating Account '${id}'`);
    const existing = await this.repository.findByIdOrThrow(id);
    if (!this.websiteRegistry.findInstance(existing)) {
      await this.websiteRegistry.create(existing);
    }
    const account = await this.repository.update(id, update);
    this.websiteRegistry.syncAccount(account);
    return account;
  }

  async updateDto(
    id: AccountId,
    update: UpdateAccountDto,
  ): Promise<IAccountDto> {
    const account = await this.update(id, update);
    return this.websiteRegistry.getAccountDto(account);
  }

  async remove(id: AccountId): Promise<void> {
    this.logger.withMetadata({ id }).info(`Removing Account '${id}'`);
    const account = await this.findByIdOrThrow(id);
    await this.websiteRegistry.remove(account);
    try {
      const result = await this.repository.deleteById([id]);
      if (result.changes > 0) {
        publishAccountRemoved(this.eventEmitter, id);
      } else {
        await this.restoreWebsiteAfterFailedDelete(account);
      }
    } catch (error) {
      await this.restoreWebsiteAfterFailedDelete(account);
      throw error;
    }
  }

  private async restoreWebsiteAfterFailedDelete(
    account: Account,
  ): Promise<void> {
    try {
      const persistedAccount = await this.findById(account.id);
      if (persistedAccount) {
        await this.websiteRegistry.create(persistedAccount);
      }
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Failed to recreate Website for Account '${account.id}'`);
    }
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
      const instance = this.findWebsiteInstanceOrThrow(account);
      await instance.clearLoginStateAndData();
    }
  }

  private findWebsiteInstanceOrThrow(account: Account) {
    const instance = this.websiteRegistry.findInstance(account);

    if (!instance) {
      throw new Error(
        `No website instance for account ${account.website} ${account.id}`,
      );
    }

    return instance;
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
    const account = await this.repository.findByIdOrThrow(
      setWebsiteDataRequestDto.id,
    );

    const instance = this.findWebsiteInstanceOrThrow(account);
    await instance.setWebsiteData(setWebsiteDataRequestDto.data);
  }
}

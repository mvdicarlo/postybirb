import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { NULL_ACCOUNT_ID, NullAccount } from '@postybirb/types';
import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { Class } from 'type-fest';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Account } from '../database/entities';
import {
  FindOptions,
  PostyBirbRepository,
} from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { waitUntil } from '../utils/wait.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';

/**
 * Service responsible for returning Account data.
 * Also stores login refresh timers for initiating login checks.
 */
@Injectable()
export class AccountService
  extends PostyBirbService<Account>
  implements OnModuleInit
{
  private readonly loginRefreshTimers: Record<
    string,
    {
      timer: NodeJS.Timeout;
      websites: Class<UnknownWebsite>[];
    }
  > = {};

  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(Account)
    repository: PostyBirbRepository<Account>,
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [Account], () => this.emit());
  }

  /**
   * Initializes all website login timers and creates instances for known accounts.
   */
  async onModuleInit() {
    await this.populateNullAccount();
    await this.initWebsiteRegistry();
    this.initWebsiteLoginRefreshTimers();

    this.emit();

    Object.keys(this.loginRefreshTimers).forEach((interval) =>
      this.executeOnLoginForInterval(interval)
    );
  }

  /**
   * Create the Nullable typed account.
   */
  private async populateNullAccount(): Promise<void> {
    if (!(await this.repository.findById(NULL_ACCOUNT_ID))) {
      await this.repository.persistAndFlush(
        this.repository.create(new NullAccount())
      );
    }
  }

  /**
   * Loads accounts into website registry.
   */
  private async initWebsiteRegistry(): Promise<void> {
    const accounts = await this.repository.find({
      id: { $ne: NULL_ACCOUNT_ID },
    });
    await Promise.all(
      accounts.map((account) => this.websiteRegistry.create(account))
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
        (website.prototype.metadata as IWebsiteMetadata).refreshInterval ??
        60_000 * 60;
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

  protected async emit() {
    const dtos = await this.findAll().then((results) =>
      results.map((account) => account.toJSON())
    );
    super.emit({
      event: ACCOUNT_UPDATES,
      data: dtos,
    });
  }

  /**
   * Runs onLogin on all created website instances within a specific interval
   * and updates website login state.
   *
   * @param {string} interval
   */
  private async executeOnLoginForInterval(interval: string | number) {
    const { websites } = this.loginRefreshTimers[interval];
    this.logger.trace(
      `Running login check on interval ${interval} for ${websites.length} websites`
    );
    websites.forEach((website) => {
      this.websiteRegistry.getInstancesOf(website).forEach((instance) => {
        this.executeOnLogin(instance);
      });
    });
  }

  /**
   * Executes onLogin for passed in website.
   * Updates caches login state and data.
   *
   * @param {UnknownWebsite} website
   */
  private async executeOnLogin(website: UnknownWebsite) {
    this.logger.trace(`Running onLogin on ${website.id}`);
    try {
      await this.awaitPendingLogin(website);
      website.onBeforeLogin();
      this.emit();
      await website.onLogin();
    } catch (e) {
      if (e instanceof Error) {
        this.logger.withError(e).error(`onLogin failed for ${website.id}`);
      }
    } finally {
      website.onAfterLogin();
      this.emit();
    }
  }

  /**
   * Logic that needs to be run after an account is created.
   *
   * @param {Account} account
   * @param {UnknownWebsite} website
   */
  private afterCreate(account: Account, website: UnknownWebsite) {
    this.executeOnLogin(website);
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

  /**
   * Executes a login refresh initiated from an external source.
   * Will always wait for current pending to complete.
   *
   * @param {string} id
   */
  async manuallyExecuteOnLogin(id: string): Promise<void> {
    const account = await this.repository.findOne(id);
    const instance = this.websiteRegistry.findInstance(account);
    await this.awaitPendingLogin(instance);
    await this.executeOnLogin(instance);
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
        `Website ${createDto.website} is not supported.`
      );
    }
    const account = this.repository.create(createDto);
    await this.repository.persistAndFlush(account);
    const instance = await this.websiteRegistry.create(account);
    this.afterCreate(account, instance);
    return this.populateAccount(account);
  }

  public findById(id: string, options?: FindOptions) {
    return this.repository
      .findById(id, options)
      .then((result) => (result ? this.populateAccount(result) : undefined));
  }

  public async findAll() {
    return (
      await this.repository.find({
        id: { $ne: NULL_ACCOUNT_ID },
      })
    ).map((result) => this.populateAccount(result));
  }

  /**
   * Mutates account and sets externally populate info.
   *
   * @param {Account} account
   * @return {*}  {Account}
   */
  private populateAccount(account: Account): Account {
    const instance = this.websiteRegistry.findInstance(account);
    if (instance) {
      // eslint-disable-next-line no-param-reassign
      account.data = instance.getWebsiteData();

      // eslint-disable-next-line no-param-reassign
      account.state = instance.getLoginState();

      // eslint-disable-next-line no-param-reassign
      account.websiteInfo = {
        websiteDisplayName:
          instance.metadata.displayName || instance.metadata.name,
        supports: instance.getSupportedTypes(),
      };
    }

    return account;
  }

  async update(id: string, update: UpdateAccountDto) {
    this.logger.withMetadata(update).info(`Updating Account '${id}'`);
    return this.populateAccount(await this.repository.update(id, update));
  }

  async remove(id: string) {
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
  async clearAccountData(id: string) {
    this.logger.withMetadata({ id }).info(`Clearing Account data for '${id}'`);
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
    const account = await this.repository.findById(
      setWebsiteDataRequestDto.id,
      { failOnMissing: true }
    );
    const instance = this.websiteRegistry.findInstance(account);
    await instance.setWebsiteData(setWebsiteDataRequestDto.data);
  }
}

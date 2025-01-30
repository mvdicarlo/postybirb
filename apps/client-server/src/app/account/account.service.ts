import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import {
  AccountId,
  IWebsiteMetadata,
  NULL_ACCOUNT_ID,
  NullAccount,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { PostyBirbService } from '../common/service/postybirb-service';
import { FindOptions } from '../database/repositories/postybirb-repository';
import { Account } from '../drizzle/models';
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

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('AccountSchema', webSocket);
    this.repository.subscribe('AccountSchema', () => this.emit());
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
      this.executeOnLoginForInterval(interval),
    );
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
      where: (account, { ne }) => ne(account.id, NULL_ACCOUNT_ID),
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

  protected async emit() {
    const dtos = await this.findAll().then((accounts) =>
      accounts.map((a) => this.injectWebsiteInstance(a)),
    );
    super.emit({
      event: ACCOUNT_UPDATES,
      data: dtos.map((dto) => dto.toDTO()),
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
      this.websiteRegistry.emit();
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
   * @param {AccountId} id
   */
  async manuallyExecuteOnLogin(id: AccountId): Promise<void> {
    const account = await this.repository.findById(id);
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
        `Website ${createDto.website} is not supported.`,
      );
    }
    const account = await this.repository.insert(createDto);
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
        where: (account, { ne }) => ne(account.id, NULL_ACCOUNT_ID),
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

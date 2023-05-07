import { ChangeSetType } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Log } from '@postybirb/logger';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { SafeObject } from '@postybirb/types';
import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { Class } from 'type-fest';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Account } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import {
  DatabaseUpdateSubscriber,
  EntityUpdateRecord,
} from '../database/subscribers/database.subscriber';
import { waitUntil } from '../utils/wait.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountDto } from './dtos/account.dto';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';

// TODO refactor to use new service type

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

  async onDatabaseUpdate(updates: EntityUpdateRecord<Account>[]) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < updates.length; i++) {
      const [type, account] = updates[i];
      // eslint-disable-next-line default-case
      switch (type) {
        case ChangeSetType.CREATE:
          this.afterCreate(
            account,
            // eslint-disable-next-line no-await-in-loop
            await this.websiteRegistry.create(account)
          );
          break;
        case ChangeSetType.DELETE:
          // eslint-disable-next-line no-await-in-loop
          await this.websiteRegistry.remove(account);
          break;
      }
    }

    this.emit();
  }

  /**
   * Initializes all website login timers and creates instances for known accounts.
   */
  async onModuleInit() {
    const accounts = await this.repository.find({});

    // Assumes that no error is thrown, otherwise there will be a big issue here.
    await Promise.all(
      accounts.map((account) => this.websiteRegistry.create(account))
    ).catch((err) => {
      this.logger.error(err, 'onModuleInit');
    });

    // Initialize website login check timers
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

    this.emit();

    // POST INIT
    Object.keys(this.loginRefreshTimers).forEach((interval) =>
      this.executeOnLoginForInterval(interval)
    );
  }

  /**
   * Emits account state and data onto websocket.
   */
  protected async emit() {
    super.emit({
      event: ACCOUNT_UPDATES,
      data: await this.findAllAccountDto(),
    });
  }

  public findOne(id: string) {
    return this.repository.findById(id, { failOnMissing: true });
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
      // @consider Force login state logged out here
      if (e instanceof Error) {
        this.logger.error(e);
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
   * @param {CreateAccountDto} createAccountDto
   * @return {*}  {Promise<Account>}
   */
  @Log()
  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    if (!this.websiteRegistry.canCreate(createAccountDto.website)) {
      throw new BadRequestException(
        `Website ${createAccountDto.website} is not supported.`
      );
    }
    const account = this.repository.create(createAccountDto);
    await this.repository.persistAndFlush(account);
    return account;
  }

  /**
   * Returns a list of all Accounts and their associated login state and data.
   *
   * @return {*}  {Promise<AccountDto<SafeObject>[]>}
   */
  async findAllAccountDto(): Promise<AccountDto<SafeObject>[]> {
    const accounts = await this.repository.find({});
    return accounts.map((account) => {
      const instance = this.websiteRegistry.findInstance(account);
      if (!instance) {
        throw new BadRequestException(
          `No instance found for account: ${account.id} ${account.website}`
        );
      }
      return account.toJson({
        loginState: instance.getLoginState(),
        data: instance.getWebsiteData(),
        websiteInfo: {
          websiteDisplayName:
            instance.metadata.displayName || instance.metadata.name,
          supports: instance.getSupportedTypes(),
        },
      });
    });
  }

  /**
   * Finds an Account matching the Id provided or throws NotFoundException.
   *
   * @param {string} id
   * @return {*}  {Promise<AccountDto<SafeObject>>}
   */
  async findAccountDto(id: string): Promise<AccountDto<SafeObject>> {
    try {
      const account = await this.repository.findOneOrFail({ id });
      const instance = this.websiteRegistry.findInstance(account);
      return {
        ...account,
        loginState: instance.getLoginState(),
        data: instance.getWebsiteData(),
        websiteInfo: {
          websiteDisplayName:
            instance.metadata.displayName || instance.metadata.name,
          supports: instance.getSupportedTypes(),
        },
      };
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Updates an Account matching the Id provided.
   *
   * @param {string} id
   * @param {UpdateAccountDto} updateAccountDto
   * @return {*}  {Promise<boolean>}
   */
  @Log()
  async update(
    id: string,
    updateAccountDto: UpdateAccountDto
  ): Promise<boolean> {
    const account: Account = await this.repository.findOne(id);
    account.name = updateAccountDto.name || account.name;
    account.groups = updateAccountDto.groups || account.groups;
    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  remove(id: string) {
    this.logger.info({}, `Removing Account '${id}'`);
    return this.repository.delete(id);
  }

  /**
   * Clears the data and login state associated with an account.
   *
   * @param {string} id
   */
  @Log()
  async clearAccountData(id: string) {
    const account = await this.repository.findOne(id);
    const instance = this.websiteRegistry.findInstance(account);
    await instance.clearLoginStateAndData();
  }

  /**
   * Sets the data saved to an account's website.
   *
   * @param {SetWebsiteDataRequestDto} setWebsiteDataRequestDto
   */
  async setAccountData(setWebsiteDataRequestDto: SetWebsiteDataRequestDto) {
    const account = await this.repository.findOne(setWebsiteDataRequestDto.id);
    const instance = this.websiteRegistry.findInstance(account);
    await instance.setWebsiteData(setWebsiteDataRequestDto.data);
  }
}

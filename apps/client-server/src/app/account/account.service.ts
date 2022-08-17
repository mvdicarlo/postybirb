import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Log, Logger } from '@postybirb/logger';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { Class } from 'type-fest';
import { Account } from '../database/entities/';
import { SafeObject } from '../shared/types/safe-object';
import { waitUntil } from '../utils/wait.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountDto } from './dtos/account.dto';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';

/**
 * Service responsible for returning Account data.
 * Also stores login refresh timers for initiating login checks.
 */
@Injectable()
export class AccountService implements OnModuleInit {
  private readonly logger = Logger(AccountService.name);

  private readonly loginRefreshTimers: Record<
    string,
    {
      timer: NodeJS.Timeout;
      websites: Class<UnknownWebsite>[];
    }
  > = {};

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: EntityRepository<Account>,
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() private readonly webSocket: WSGateway
  ) {}

  /**
   * Initializes all website login timers and creates instances for known accounts.
   */
  async onModuleInit() {
    const accounts = await this.accountRepository.find({});

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
  private async emit() {
    if (this.webSocket) {
      this.webSocket.emit({
        event: ACCOUNT_UPDATES,
        data: await this.findAll(),
      });
    }
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
    const account = await this.findOne(id);
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
    const account = this.accountRepository.create(createAccountDto);
    await this.accountRepository.persistAndFlush(account);
    const website = await this.websiteRegistry.create(account);
    this.afterCreate(account, website);
    this.emit();
    return account;
  }

  /**
   * Returns a list of all Accounts and their associated login state and data.
   *
   * @return {*}  {Promise<AccountDto<SafeObject>[]>}
   */
  async findAll(): Promise<AccountDto<SafeObject>[]> {
    const accounts = await this.accountRepository.find({});
    return accounts.map((account) => {
      const instance = this.websiteRegistry.findInstance(account);
      return {
        ...account,
        loginState: instance.getLoginState(),
        data: instance.getWebsiteData(),
      };
    });
  }

  /**
   * Finds an Account matching the Id provided or throws NotFoundException.
   *
   * @param {string} id
   * @return {*}  {Promise<AccountDto<SafeObject>>}
   */
  async findOne(id: string): Promise<AccountDto<SafeObject>> {
    try {
      const account = await this.accountRepository.findOneOrFail({ id });
      const instance = this.websiteRegistry.findInstance(account);
      return {
        ...account,
        loginState: instance.getLoginState(),
        data: instance.getWebsiteData(),
      };
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Finds an account matching the Id provided.
   * Does not return additional login data.
   *
   * @param {string} id
   * @return {*}  {Promise<Account>}
   */
  async findAccount(id: string): Promise<Account> {
    try {
      return await this.accountRepository.findOneOrFail({ id });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Deleted an Account matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<DeleteResult>}
   */
  @Log()
  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);
    await this.websiteRegistry.remove(account);
    return this.accountRepository.removeAndFlush(account).then((result) => {
      this.emit();
      return result;
    });
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
    const account = await this.findOne(id);
    Object.apply(account, updateAccountDto);
    return this.accountRepository
      .flush()
      .then(() => this.emit())
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  /**
   * Clears the data and login state associated with an account.
   *
   * @param {string} id
   */
  @Log()
  async clearAccountData(id: string) {
    const account = await this.findOne(id);
    const instance = this.websiteRegistry.findInstance(account);
    await instance.clearLoginStateAndData();
  }

  /**
   * Sets the data saved to an account's website.
   *
   * @param {SetWebsiteDataRequestDto} setWebsiteDataRequestDto
   */
  async setAccountData(setWebsiteDataRequestDto: SetWebsiteDataRequestDto) {
    const account = await this.findOne(setWebsiteDataRequestDto.id);
    const instance = this.websiteRegistry.findInstance(account);
    await instance.setWebsiteData(setWebsiteDataRequestDto.data);
  }
}

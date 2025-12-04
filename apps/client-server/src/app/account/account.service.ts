import {
    BadRequestException,
    Injectable,
    OnModuleInit,
    Optional,
} from '@nestjs/common';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import {
    AccountId,
    NULL_ACCOUNT_ID
} from '@postybirb/types';
import { ne } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Account } from '../drizzle/models';
import { FindOptions } from '../drizzle/postybirb-database/find-options.type';
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
  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('AccountSchema', webSocket);
  }

  /**
   * Initializes all website login timers and creates instances for known accounts.
   * Heavy operations are deferred to avoid blocking application startup.
   */
  async onModuleInit() {
    // Logic moved to AccountBootstrapper
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
      this.logger.withError(e).error(`onLogin failed for ${website.id}`);
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

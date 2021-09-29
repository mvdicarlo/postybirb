import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { AccountEvent } from '@postybirb/socket-events';
import { DeleteResult, Repository } from 'typeorm';
import { ACCOUNT_REPOSITORY } from '../constants';
import { Ctor } from '../shared/interfaces/constructor.interface';
import { SafeObject } from '../shared/types/safe-object.type';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WSGateway } from '../websocket/websocket.gateway';
import { AccountDto } from './dtos/account.dto';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { Account } from './entities/account.entity';

/**
 * Service responsible for returning Account data.
 * Also stores login refresh timers for initiating login checks.
 */
@Injectable()
export class AccountService implements OnModuleInit {
  private readonly logger: Logger = new Logger(AccountService.name);

  private readonly loginRefreshTimers: Record<
    string,
    {
      timer: NodeJS.Timeout;
      websites: Ctor<UnknownWebsite>[];
    }
  > = {};

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: Repository<Account>,
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() private readonly webSocket: WSGateway
  ) {}

  /**
   * Initializes all website login timers and creates instances for known accounts.
   */
  async onModuleInit() {
    const accounts = await this.accountRepository.find();

    // Assumes that no error is thrown, otherwise there will be a big issue here.
    const instances = await Promise.all(
      accounts.map((account) => this.websiteRegistry.create(account))
    ).catch((err) => {
      this.logger.error(err.message, err.stack, 'Account onModuleInit');
    });

    // Initialize website login check timers
    const availableWebsites = this.websiteRegistry.getAvailableWebsites();
    availableWebsites.forEach((website) => {
      const interval =
        website.prototype.metadata.refreshInterval ?? 60_000 * 60;
      if (!this.loginRefreshTimers[interval]) {
        this.loginRefreshTimers[interval] = {
          websites: [],
          timer: setInterval(() => {
            this.executeOnLogin(interval);
          }, interval),
        };
      }

      this.loginRefreshTimers[interval].websites.push(website);
    });

    this.emit();

    // POST INIT
    Object.keys(this.loginRefreshTimers).forEach(
      this.executeOnLoginForInterval
    );
  }

  /**
   * Emits account state and data onto websocket.
   */
  private async emit() {
    if (this.webSocket) {
      this.webSocket.emit({
        event: AccountEvent.ACCOUNT_UPDATES,
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
  private async executeOnLoginForInterval(interval: string) {
    const { websites } = this.loginRefreshTimers[interval];
    this.logger.log(
      `Running login check on interval ${interval} for ${websites.length} websites`
    );
    websites.forEach((website) => {
      this.websiteRegistry.getInstancesOf(website).forEach(this.executeOnLogin);
    });
  }

  /**
   * Executes onLogin for passed in website.
   * Updates caches login state and data.
   *
   * @param {UnknownWebsite} website
   */
  private async executeOnLogin(website: UnknownWebsite) {
    this.logger.log(`Running onLogin on ${website.id}`);
    try {
      website.onBeforeLogin();
      this.emit();
      await website.onLogin();
    } catch (e) {
      // @consider Force login state logged out here
      if (e instanceof Error) {
        this.logger.error(
          `Website onLogin threw exception: ${e.message}`,
          e.stack
        );
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
   * Creates an Account.
   * @param {CreateAccountDto} createAccountDto
   */
  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create(createAccountDto);
    this.logger.log(`Creating account - ${JSON.stringify(account)}`);
    const createdAccount = await this.accountRepository.save(account);
    const website = await this.websiteRegistry.create(createdAccount);
    this.afterCreate(createdAccount, website);
    return createdAccount;
  }

  /**
   * Returns a list of all Accounts and their associated login state and data.
   */
  async findAll(): Promise<AccountDto<SafeObject>[]> {
    const accounts = await this.accountRepository.find();
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
   */
  async findOne(id: string): Promise<AccountDto<SafeObject>> {
    try {
      const account = await this.accountRepository.findOneOrFail(id);
      const instance = this.websiteRegistry.findInstance(account);
      return {
        ...account,
        loginState: instance.getLoginState(),
        data: instance.getWebsiteData(),
      };
    } catch (e) {
      throw new NotFoundException(id);
    }
  }

  /**
   * Deleted an Account matching the Id provided.
   */
  async remove(id: string): Promise<DeleteResult> {
    const account = await this.findOne(id);
    this.logger.log(`Deleting account ${id}`);
    await this.websiteRegistry.remove(account);
    return await this.accountRepository.delete(id).then((result) => {
      this.emit();
      return result;
    });
  }

  /**
   * Updates an Account matching the Id provided.
   */
  async update(
    id: string,
    updateAccountDto: UpdateAccountDto
  ): Promise<boolean> {
    await this.findOne(id);
    this.logger.log(
      `Updating account ${id} - ${JSON.stringify(updateAccountDto)}`
    );
    return await this.accountRepository
      .update(id, updateAccountDto)
      .then(() => this.emit())
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DeleteResult, Repository } from 'typeorm';
import { ACCOUNT_REPOSITORY } from '../constants';
import { Ctor } from '../shared/interfaces/constructor.interface';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountLoginStateService } from './account-login-state/account-login-state.service';
import { AccountDto } from './dtos/account.dto';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { Account } from './entities/account.entity';

/**
 * @todo initialization and timer setup
 * @todo remove instances from timers on delete
 * @todo figure out how to handle timers and their cleanup
 * @todo figure out how/when to emit to socket
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
    private readonly accountLoginState: AccountLoginStateService,
    private readonly websiteRegistry: WebsiteRegistryService
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

    this.accountLoginState.initializeLoginStates(accounts);
    Object.keys(this.loginRefreshTimers).forEach(this.executeOnLogin);
  }

  /**
   * Runs onLogin on all created website instances and updates website login state.
   */
  private async executeOnLogin(interval: string) {
    const { websites } = this.loginRefreshTimers[interval];
    this.logger.log(
      `Running login check on interval ${interval} for ${websites.length} websites`
    );
    websites.forEach((website) => {
      this.websiteRegistry
        .getInstancesOf(website)
        .forEach(this.accountLoginState.executeOnLogin);
    });
  }

  /**
   * Logic that needs to be run after an account is created.
   *
   * @param {Account} account
   * @param {UnknownWebsite} website
   */
  private afterCreate(account: Account, website: UnknownWebsite) {
    this.accountLoginState.executeOnLogin(website);
  }

  /**
   * Creates an Account.
   * @todo Fire off side-effects
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
  findAll(): Promise<AccountDto<Record<string, unknown>>[]> {
    return this.accountRepository.find().then((accounts) => {
      return accounts.map((account) => {
        const instance = this.websiteRegistry.findInstance(account);
        return {
          ...account,
          loginState: instance.getLoginState(),
          data: instance.getWebsiteData(),
        };
      });
    });
  }

  /**
   * Finds an Account matching the Id provided or throws NotFoundException.
   * @todo get real website state and data
   */
  findOne(id: string): Promise<AccountDto<Record<string, unknown>>> {
    return this.accountRepository
      .findOneOrFail(id)
      .then((account) => {
        const instance = this.websiteRegistry.findInstance(account);
        return {
          ...account,
          loginState: instance.getLoginState(),
          data: instance.getWebsiteData(),
        };
      })
      .catch(() => {
        throw new NotFoundException(id);
      });
  }

  /**
   * Deleted an Account matching the Id provided.
   * @todo cleanup website resources
   */
  async remove(id: string): Promise<DeleteResult> {
    const account = await this.findOne(id);
    this.logger.log(`Deleting account ${id}`);
    await this.websiteRegistry.remove(account);
    return await this.accountRepository.delete(id);
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
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}

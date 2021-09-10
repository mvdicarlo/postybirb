import { Logger } from '@nestjs/common';
import { LoginState } from './models/login-state.model';
import WebsiteData from './website-data';
import { session } from 'electron';
import { Account } from '../accounts/models/account.model';
import { getPartitionKey } from '@postybirb/utils/electron';

export default abstract class Website<D extends Record<string, unknown>> {
  protected readonly logger: Logger;

  /**
   * User account info for reference primarily during posting and login.
   */
  protected readonly account: Account;

  /**
   * Data store for website data that is persisted to dick and read on initialization.
   */
  protected readonly websiteDataStore: WebsiteData<D>;

  /**
   * Tracks the login state of a website.
   */
  protected readonly loginState: LoginState;

  /**
   * Base website URL user for reference during website calls.
   */
  protected abstract readonly BASE_URL: string;

  constructor(userAccount: Account) {
    const { id, website } = userAccount;
    const alias = `${website}-${id}`;

    this.logger = new Logger(`[${typeof this}:${id}]`);
    this.account = userAccount;
    this.websiteDataStore = new WebsiteData(alias);
    this.loginState = new LoginState();
  }

  // -------------- Externally Accessed Methods --------------
  // Methods intended to be executed to be run by consumers of a Website

  public async clearLoginStateAndData() {
    this.logger.log('Clearing login state and data');
    await session
      .fromPartition(getPartitionKey(this.account.id))
      .clearStorageData();
    this.websiteDataStore.clearData();
    this.loginState.logout();
  }

  public getWebsiteData(): D {
    return this.websiteDataStore.getData();
  }

  // -------------- End Externally Accessed Methods --------------

  // -------------- Event Methods --------------

  /**
   * Method that runs once on initialization of the Website class.
   */
  public onInitialize(): void {
    this.logger.log('Initializing');

    this.websiteDataStore.initialize();

    this.logger.log('Finished initializing');
  }

  /**
   * Method that runs whenever a user closes the login page or on a scheduled interval.
   */
  public abstract onLogin(): Promise<LoginState>;

  // -------------- End Event Methods --------------
}

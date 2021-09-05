import { Logger } from '@nestjs/common';
import UserAccount from '../account/models/user-account.model';
import LoginResponse from './models/login-response.model';
import WebsiteData from './website-data';

export default abstract class Website<D extends Record<string, unknown>> {
  protected readonly logger: Logger;

  /**
   * UserAccount info for reference primarily during posting and login.
   */
  protected readonly account: UserAccount;

  /**
   * Data store for website data that is persisted to dick and read on initialization.
   */
  protected readonly websiteDataStore: WebsiteData<D>;

  /**
   * Base website URL user for reference during website calls.
   */
  protected abstract readonly BASE_URL: string;

  constructor(userAccount: UserAccount) {
    const { id, website } = userAccount;
    const alias = `${website}-${id}`;

    this.logger = new Logger(`[${typeof this}:${id}]`);
    this.account = userAccount;
    this.websiteDataStore = new WebsiteData(alias);
  }

  // -------------- Data Access Methods --------------

  public clearWebsiteData() {
    this.websiteDataStore.clearData();
  }

  public getWebsiteData(): D {
    return this.websiteDataStore.getData();
  }

  // -------------- End Data Access Methods --------------

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
  public abstract onLogin(): Promise<LoginResponse>;

  // -------------- End Event Methods --------------
}

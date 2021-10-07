import { Logger } from '@nestjs/common';
import { LoginState } from './models/login-state.model';
import WebsiteDataManager from './website-data-manager';
import { session } from 'electron';
import { Account } from '../account/entities/account.entity';
import { getPartitionKey } from '@postybirb/utils/electron';
import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { ILoginState } from './models/login-state.interface';
import { SafeObject } from '../shared/types/safe-object.type';
import { DataPropertyAccessibility } from './models/data-property-accessibility.type';
import { WebsiteData } from './entities/website-data.entity';
import { Repository } from 'typeorm';

export type UnknownWebsite = Website<SafeObject>;

export abstract class Website<D extends SafeObject> {
  protected readonly logger: Logger;

  /**
   * User account info for reference primarily during posting and login.
   */
  protected readonly account: Account;

  /**
   * Data store for website data that is persisted to dick and read on initialization.
   */
  protected readonly websiteDataStore: WebsiteDataManager<D>;

  /**
   * Tracks the login state of a website.
   */
  protected readonly loginState: LoginState;

  /**
   * Do not set this manually.
   * This property is filled with the {WebsiteMetadata} decorator.
   */
  public readonly metadata: IWebsiteMetadata;

  /**
   * Base website URL user for reference during website calls.
   */
  protected abstract readonly BASE_URL: string;

  /**
   * An explicit map of data properties of {D} that is allowed to be sent back out of the
   * client server to the ui.
   *
   * Just an extra protection to reduce unnecessary passing of sensitive keys.
   */
  public abstract readonly externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<D>;

  /**
   * Reference Id of a website instance.
   *
   * @readonly
   * @type {string}
   */
  public get id(): string {
    return `${this.account.website}:${this.account.id}[${this.account.name}]`;
  }

  /**
   * Reference to account id.
   *
   * @readonly
   * @type {string}
   */
  public get accountId(): string {
    return this.account.id;
  }

  constructor(userAccount: Account) {
    this.account = userAccount;
    this.logger = new Logger(this.id);
    this.websiteDataStore = new WebsiteDataManager(userAccount);
    this.loginState = new LoginState();
  }

  // -------------- Externally Accessed Methods --------------
  // Methods intended to be executed to be run by consumers of a Website

  public async clearLoginStateAndData() {
    this.logger.log('Clearing login state and data');
    await session
      .fromPartition(getPartitionKey(this.account.id))
      .clearStorageData();
    await this.websiteDataStore.clearData();
    this.loginState.logout();
  }

  /**
   * Returns website data.
   * Filters out any property marked false in externallyAccessibleWebsiteDataProperties.
   */
  public getWebsiteData(): D {
    const data = this.websiteDataStore.getData();

    // Filter any property marked false
    Object.entries(this.externallyAccessibleWebsiteDataProperties)
      .filter(([key, value]) => !value)
      .forEach(([key]) => {
        delete data[key];
      });

    return data;
  }

  public getLoginState() {
    return this.loginState.getState();
  }

  // -------------- End Externally Accessed Methods --------------

  // -------------- Event Methods --------------

  /**
   * Method that runs once on initialization of the Website class.
   */
  public async onInitialize(
    websiteDataRepository: Repository<WebsiteData<D>>
  ): Promise<void> {
    this.logger.log('onInitialize');

    await this.websiteDataStore.initialize(websiteDataRepository);

    this.logger.log('Done onInitialize');
  }

  /**
   * Method that runs before onLogin to set pending flag.
   */
  public onBeforeLogin() {
    this.logger.verbose('onBeforeLogin');

    this.loginState.pending = true;

    this.logger.verbose('Done onBeforeLogin');
  }

  /**
   * Method that runs after onLogin completes to remove pending flag.
   */
  public onAfterLogin() {
    this.logger.verbose('onAfterLogin');

    this.loginState.pending = false;

    this.logger.verbose('Done onAfterLogin');
  }

  /**
   * Method that runs whenever a user closes the login page or on a scheduled interval.
   */
  public abstract onLogin(): Promise<ILoginState>;

  // -------------- End Event Methods --------------
}

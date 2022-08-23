import { EntityRepository } from '@mikro-orm/core';
import {
  ILoginState,
  UsernameShortcut,
  WebsiteLoginType,
} from '@postybirb/dto';
import { Logger } from '@postybirb/logger';
import { getPartitionKey } from '@postybirb/utils/electron';
import { IWebsiteMetadata } from '@postybirb/website-metadata';
// eslint-disable-next-line import/no-extraneous-dependencies
import { session } from 'electron';
import { Logger as PinoLogger } from 'pino';
import { IAccount } from '../account/models/account';
import { WebsiteData } from '../database/entities/';
import { SafeObject } from '../shared/types/safe-object';
import { DataPropertyAccessibility } from './models/data-property-accessibility';
import { LoginState } from './models/login-state';
import WebsiteDataManager from './website-data-manager';

export type UnknownWebsite = Website<any>;

export abstract class Website<D extends SafeObject> {
  protected readonly logger: PinoLogger;

  /**
   * User account info for reference primarily during posting and login.
   */
  protected readonly account: IAccount;

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
   * Do not set this manually. Apply with @LoginType decorator
   * A property used to define how a user will login through the UI.
   * @type {UserLoginType} - User will login through a webview using the provided url.
   * @type {CustomLoginType} - User will login through a custom login flow created by the implementer.
   * @type {WebsiteLoginType}
   */
  public readonly loginType: WebsiteLoginType;

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

  public readonly usernameShortcut: UsernameShortcut;

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

  constructor(userAccount: IAccount) {
    this.account = userAccount;
    this.logger = Logger(this.id);
    this.websiteDataStore = new WebsiteDataManager(userAccount);
    this.loginState = new LoginState();
  }

  // -------------- Externally Accessed Methods --------------
  // Methods intended to be executed to be run by consumers of a Website

  public async clearLoginStateAndData() {
    this.logger.info('Clearing login state and data');
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
      .filter(([, value]) => !value)
      .forEach(([key]) => {
        delete data[key];
      });

    return data;
  }

  public getLoginState() {
    return this.loginState.getState();
  }

  /**
   * Sets the website data provided by user or other means.
   * @param {D} data
   */
  public async setWebsiteData(data: D) {
    await this.websiteDataStore.setData(data);
  }

  // -------------- End Externally Accessed Methods --------------

  // -------------- Event Methods --------------

  /**
   * Method that runs once on initialization of the Website class.
   */
  public async onInitialize(
    websiteDataRepository: EntityRepository<WebsiteData<D>>
  ): Promise<void> {
    this.logger.trace('onInitialize');

    await this.websiteDataStore.initialize(websiteDataRepository);

    this.logger.trace('Done onInitialize');
  }

  /**
   * Method that runs before onLogin to set pending flag.
   */
  public onBeforeLogin() {
    this.logger.trace('onBeforeLogin');

    this.loginState.pending = true;

    this.logger.trace('Done onBeforeLogin');
  }

  /**
   * Method that runs after onLogin completes to remove pending flag.
   */
  public onAfterLogin() {
    this.logger.trace('onAfterLogin');

    this.loginState.pending = false;

    this.logger.trace('Done onAfterLogin');
  }

  /**
   * Method that runs whenever a user closes the login page or on a scheduled interval.
   */
  public abstract onLogin(): Promise<ILoginState>;

  // -------------- End Event Methods --------------
}

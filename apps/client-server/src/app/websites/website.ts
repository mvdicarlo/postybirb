import { Logger, PostyBirbLogger } from '@postybirb/logger';
import {
  DynamicObject,
  IAccount,
  IAccountDto,
  IEntityDto,
  ILoginState,
  LoginState,
  SubmissionType,
} from '@postybirb/types';
import { getPartitionKey } from '@postybirb/utils/electron';
import { session } from 'electron';
import { Account, WebsiteData } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { WebsiteDecoratorProps } from './decorators/website-decorator-props';
import { DataPropertyAccessibility } from './models/data-property-accessibility';
import {
  FileWebsiteKey,
  isFileWebsite,
} from './models/website-modifiers/file-website';
import {
  isMessageWebsite,
  MessageWebsiteKey,
} from './models/website-modifiers/message-website';
import WebsiteDataManager from './website-data-manager';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnknownWebsite = Website<any>;

export abstract class Website<D extends DynamicObject> {
  protected readonly logger: PostyBirbLogger;

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
   * Properties set by website decorators such as {@link WebsiteMetadata}.
   * These should only be set by a decorator.
   * @type {WebsiteDecoratorProps}
   */
  public readonly decoratedProps: WebsiteDecoratorProps;

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

  public get accountInfo() {
    return this.account.toJSON() as IEntityDto<IAccount>;
  }

  public get accountDto(): IAccountDto {
    return {
      ...this.accountInfo,
      state: this.getLoginState(),
      data: this.getWebsiteData(),
      websiteInfo: {
        websiteDisplayName:
          this.decoratedProps.metadata.displayName ||
          this.decoratedProps.metadata.name,
        supports: this.getSupportedTypes(),
      },
    };
  }

  /**
   * Whether or not this class supports {SubmissionType.FILE}.
   *
   * @readonly
   * @type {boolean}
   */
  public get supportsFile(): boolean {
    return FileWebsiteKey in this;
  }

  /**
   * Whether or not this class supports {SubmissionType.MESSAGE}.
   *
   * @readonly
   * @type {boolean}
   */
  public get supportsMessage(): boolean {
    return MessageWebsiteKey in this;
  }

  /**
   * Creates a model for file submissions.
   */
  getModelFor(type: SubmissionType) {
    if (type === SubmissionType.FILE && isFileWebsite(this)) {
      return this.createFileModel();
    }

    if (type === SubmissionType.MESSAGE && isMessageWebsite(this)) {
      return this.createMessageModel();
    }

    throw new Error(`Unsupported submission type: ${type}`);
  }

  constructor(userAccount: Account) {
    this.account = userAccount;
    this.logger = Logger();
    this.websiteDataStore = new WebsiteDataManager(userAccount);
    this.loginState = new LoginState();
  }

  // -------------- Externally Accessed Methods --------------
  // Methods intended to be executed by consumers of a Website

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

  /**
   * Returns properties to be used in the form generator.
   * This should be extended by the website to provide additional properties as needed.
   */
  public getFormProperties(): DynamicObject {
    const longTermData = this.getWebsiteData();
    return {
      ...longTermData,
    };
  }

  /**
   * Returns the login state of the website.
   */
  public getLoginState() {
    return this.loginState.getState();
  }

  /**
   * Returns an array of supported SubmissionType based on implemented interfaces.
   */
  public getSupportedTypes(): SubmissionType[] {
    const types: SubmissionType[] = [];

    if (this.supportsMessage) {
      types.push(SubmissionType.MESSAGE);
    }

    if (this.supportsFile) {
      types.push(SubmissionType.FILE);
    }

    return types;
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
    websiteDataRepository: PostyBirbRepository<WebsiteData<D>>,
  ): Promise<void> {
    await this.websiteDataStore.initialize(websiteDataRepository);
  }

  /**
   * Method that runs before onLogin to set pending flag.
   */
  public onBeforeLogin() {
    this.loginState.pending = true;
  }

  /**
   * Method that runs after onLogin completes to remove pending flag.
   */
  public onAfterLogin() {
    this.loginState.pending = false;
  }

  /**
   * Method that runs whenever a user closes the login page or on a scheduled interval.
   */
  public abstract onLogin(): Promise<ILoginState>;

  // -------------- End Event Methods --------------
}

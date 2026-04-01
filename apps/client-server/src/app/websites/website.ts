import { Logger, PostyBirbLogger } from '@postybirb/logger';
import {
  DynamicObject,
  ILoginState,
  IWebsiteFormFields,
  LoginState,
  SubmissionType,
} from '@postybirb/types';
import { BrowserWindowUtils, getPartitionKey } from '@postybirb/utils/electron';
import { Mutex } from 'async-mutex';
import { CookiesSetDetails, session } from 'electron';
import { Account } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { SubmissionValidator } from './commons/validator';
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

const CookiePrefix = 'postybirb:session:';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnknownWebsite = Website<any>;

export abstract class Website<
  D extends DynamicObject,
  SessionData extends Record<string, unknown> = Record<string, unknown>,
> {
  protected readonly logger: PostyBirbLogger;

  /**
   * User account info for reference primarily during posting and login.
   */
  public readonly account: Account;

  /**
   * Data store for website data that is persisted to dick and read on initialization.
   */
  protected readonly websiteDataStore: WebsiteDataManager<D>;

  /**
   * Intended location for storing dynamically retrieved
   * information for a website instance.
   *
   * Commons things that go here would be folders.
   *
   * This is not persisted across app restarts.
   */
  protected readonly sessionData: SessionData = {} as SessionData;

  /**
   * Tracks the login state of a website.
   */
  protected readonly loginState: LoginState;

  /**
   * Mutex that serializes login attempts for this website instance.
   * The first caller acquires the lock and runs the full login lifecycle;
   * subsequent callers wait for the lock and return the fresh state.
   */
  private readonly loginMutex = new Mutex();

  /**
   * When true, a follow-up login will run after the current one completes.
   * This handles the case where cookies/state changed during an in-flight login
   * (e.g. user logs in on a page while a login check is already running).
   * Only one follow-up is ever queued regardless of how many callers request it.
   */
  private loginDirty = false;

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
    return `${this.account.website}:an=[${this.account.name}]:acid=[${this.account.id}]`;
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

  /**
   * Creates new validator to be used in onValidateFileSubmission or onValidateMessageSubmission
   */
  protected createValidator<T extends IWebsiteFormFields = never>() {
    return new SubmissionValidator<T>();
  }

  constructor(userAccount: Account) {
    this.account = userAccount;
    this.logger = Logger(this.decoratedProps.metadata.displayName);
    this.websiteDataStore = new WebsiteDataManager(userAccount);
    this.loginState = new LoginState();
  }

  // -------------- Externally Accessed Methods --------------
  // Methods intended to be executed by consumers of a Website

  public async clearLoginStateAndData(forWebsiteDeletion = false) {
    this.logger.info('Clearing login state and data');
    await session
      .fromPartition(getPartitionKey(this.account.id))
      .clearStorageData();
    await this.websiteDataStore.clearData(!forWebsiteDeletion);
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

    return { ...data };
  }

  /**
   * Returns properties to be used in the form generator.
   * This should be extended by the website to provide additional properties as needed.
   */
  public getFormProperties(): DynamicObject {
    const longTermData = this.getWebsiteData();
    const shortTermData = this.sessionData;
    return {
      ...longTermData,
      ...shortTermData,
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
    this.onWebsiteDataChange(data);
  }

  /**
   * Hook that runs whenever website data is updated via {@link setWebsiteData}.
   * Subclasses can implement this to react to data changes, e.g. update internal state or trigger side effects.
   * @param {D} newData - The new website data that was set.
   * @returns {Promise<void>}
   */
  protected async onWebsiteDataChange(newData: D) {
    // Nothing to do here yet, but this is a hook for future if we want to trigger any actions on data change
  }

  // -------------- End Externally Accessed Methods --------------

  // -------------- Login Methods --------------

  /**
   * Public entry point for login. Serialized via mutex so that:
   * - The first caller runs the full lifecycle (onBeforeLogin -> onLogin).
   * - Concurrent callers mark the login as dirty so one follow-up runs.
   * - At most one follow-up is queued, not one per waiter.
   *
   * @returns {Promise<ILoginState>} The login state after the check completes.
   */
  public async login(): Promise<ILoginState> {
    // If the mutex is already locked, mark dirty so a follow-up runs,
    // then wait for all pending work (current + follow-up) to finish.
    if (this.loginMutex.isLocked()) {
      this.logger.debug(
        `Login already in progress for ${this.id}, marking dirty and waiting...`,
      );
      this.loginDirty = true;
      await this.loginMutex.waitForUnlock();
      return this.loginState.getState();
    }

    return this.loginMutex.runExclusive(async () => {
      await this.executeLogin();

      if (this.loginDirty) {
        this.loginDirty = false;
        this.logger.debug(
          `Running follow-up login for ${this.id} (state may have changed during previous run)`,
        );
        if (!this.loginState.isLoggedIn) {
          await this.executeLogin();
        }
      }

      return this.loginState.getState();
    });
  }

  /**
   * Runs the actual login lifecycle: onBeforeLogin -> onLogin.
   * Must only be called while holding the loginMutex.
   */
  private async executeLogin(): Promise<void> {
    try {
      this.loginState.setPending(true);
      await this.onBeforeLogin();
      await this.onLogin();
    } catch (e) {
      this.logger.withError(e).error(`Login failed for ${this.id}`);
    } finally {
      this.loginState.setPending(false);
    }
  }

  // -------------- End Login Methods --------------

  // -------------- Event Methods --------------

  /**
   * Method that runs once on initialization of the Website class.
   */
  public async onInitialize(
    websiteDataRepository: PostyBirbDatabase<'WebsiteDataSchema'>,
  ): Promise<void> {
    await this.websiteDataStore.initialize(websiteDataRepository);
  }

  /**
   * Method that attempts to refresh expired cookies for user login flows.
   * This is a workaround to load the actual web page in the background to refresh cookies that may be expiring.
   */
  private async cycleCookies(): Promise<void> {
    if (this.decoratedProps.loginFlow.type === 'user') {
      this.logger.debug('Cycling cookies for user login flow');
      await BrowserWindowUtils.ping(this.accountId, this.BASE_URL).catch(
        (err) => {
          this.logger.error('Error cycling cookies:', err);
        },
      );
    }
  }

  /**
   * Runs before onLogin to handle cookie management.
   * For user login flows, it checks for expired cookies and attempts to refresh them.
   * Also persists session cookies with a prefix for cross-restart persistence.
   *
   * @protected - called internally by {@link login}.
   */
  protected async onBeforeLogin() {
    try {
      if (this.decoratedProps.loginFlow.type === 'user') {
        const { cookies } = session.fromPartition(
          getPartitionKey(this.accountId),
        );
        const cookiesList = await cookies.get({});
        for (const cookie of cookiesList) {
          // Check for expired cookies
          if (
            cookie.expirationDate &&
            cookie.expirationDate < Date.now() / 1000
          ) {
            this.logger.debug(
              `Found expired cookie: ${cookie.name} (${cookie.domain}) - Expired at ${new Date(cookie.expirationDate * 1000).toISOString()}`,
            );
            await this.cycleCookies();
          }

          if (cookie.session) {
            const setCookie: CookiesSetDetails = {
              url: `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
              name: `${CookiePrefix}${cookie.name}`,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              sameSite: cookie.sameSite,
              expirationDate:
                Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
            };
            await cookies.set(setCookie);
            await cookies.flushStore();
          } else if (cookie.name.startsWith(CookiePrefix)) {
            const sessionCookieAlreadyPopulated = cookiesList.some(
              (c) => c.name === cookie.name.replace(CookiePrefix, ''),
            );
            if (!sessionCookieAlreadyPopulated) {
              this.logger.debug(
                `Rehydrating session cookie: ${cookie.name} (${cookie.domain})`,
              );
              const setCookie: CookiesSetDetails = {
                url: `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
                name: cookie.name.replace(CookiePrefix, ''),
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
              };
              await cookies.set(setCookie);
              await cookies.flushStore();
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Error during onBeforeLogin cookie handling:', err);
    }
  }

  /**
   * Method that runs whenever a user closes the login page or on a scheduled interval.
   * Subclasses implement this to perform the actual login / session-validation logic.
   *
   * @protected - called internally by {@link login}.
   */
  protected abstract onLogin(): Promise<ILoginState>;

  // -------------- End Event Methods --------------
}

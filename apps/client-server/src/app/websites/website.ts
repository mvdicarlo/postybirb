import { Account, WebsiteDataRepository } from '@postybirb/database';
import { Logger, PostyBirbLogger } from '@postybirb/logger';
import {
  PlatformCookieChange,
  PlatformCookieDetails,
  PlatformService,
} from '@postybirb/platform';
import {
  DynamicObject,
  IAccountDto,
  ILoginState,
  IWebsiteFormFields,
  LoginResult,
  LoginState,
  SubmissionType
} from '@postybirb/types';
import { Mutex } from 'async-mutex';
import { SubmissionValidator } from './commons/validator';
import {
  cloneWebsiteDecoratorProps,
  cloneWebsiteFileOptions,
  WebsiteDecoratorProps,
} from './decorators/website-decorator-props';
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

/**
 * Debounce window for login checks triggered by cookie changes. A single page
 * load can set many cookies in rapid succession, so we coalesce the burst into
 * one login check.
 */
const COOKIE_CHANGE_DEBOUNCE_MS = 1_000;

/**
 * Window after a login completes during which cookie changes are ignored. Our
 * own onBeforeLogin writes/rehydrates session cookies, which would otherwise
 * re-trigger a login and create a feedback loop.
 */
const COOKIE_SELF_MUTATION_BUFFER_MS = 1_000;

const DEFAULT_LOGIN_REFRESH_INTERVAL_MS = 60 * 60_000;

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
  public account: Account;

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
   * Tracks the login state of a website. Immutable snapshot owned exclusively
   * by the login lifecycle; reassigned (never mutated) on each transition.
   */
  private loginState: LoginState = LoginState.initial();

  private onAccountProjectionChanged?: (account: IAccountDto) => void;

  private disposed = false;

  private disposePromise?: Promise<void>;

  private deletePromise?: Promise<void>;

  private loginRefreshTimer?: NodeJS.Timeout;

  /**
   * Ignorable noisy cookies that are written by the website but not relevant to our login state.
   */
  protected readonly cookieIgnoreList: string[] = [];

  /**
   * Mutex that serializes login attempts for this website instance.
   * The first caller acquires the lock and runs the full login lifecycle;
   * subsequent callers wait for the lock and return the fresh state.
   */
  private readonly loginMutex = new Mutex();

  /**
   * Unsubscribe handle for the per-partition cookie-change listener, if
   * subscribed. Only set for 'user' (webview) login flows.
   */
  private cookieChangeUnsubscribe?: () => void;

  /**
   * Pending debounce timer for a cookie-change-triggered login check.
   */
  private cookieChangeDebounceTimer?: NodeJS.Timeout;

  /**
   * Epoch ms until which cookie-change triggers are ignored, used to filter out
   * the cookie writes performed by our own login lifecycle.
   */
  private suppressCookieChangeUntil = 0;

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

  public get isDisposed(): boolean {
    return this.disposed;
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

  constructor(userAccount: Account, platform: PlatformService) {
    this.account = userAccount;
    this.platform = platform;
    this.decoratedProps = cloneWebsiteDecoratorProps(this.decoratedProps);
    this.logger = Logger(this.decoratedProps.metadata.displayName);
    this.websiteDataStore = new WebsiteDataManager(userAccount);
  }

  /**
   * Platform services made available to the website (cookies, headless
   * browser, app metadata, notifications, network). Bundled into a single
   * facade so adding new platform capabilities does not change every
   * subclass constructor.
   */
  public readonly platform: PlatformService;

  // -------------- Externally Accessed Methods --------------
  // Methods intended to be executed by consumers of a Website

  public async clearLoginStateAndData(forWebsiteDeletion = false) {
    this.logger.info('Clearing login state and data');
    if (forWebsiteDeletion) {
      this.unsubscribeFromCookieChanges();
    }
    await this.platform.session.clearStorageData(this.account.id);
    await this.websiteDataStore.clearData(!forWebsiteDeletion, false);
    this.loginState = this.loginState.reset();
    if (!forWebsiteDeletion) {
      this.notifyAccountProjectionChanged();
    }
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
   * Returns a serializable snapshot of the website's login state.
   */
  public getLoginState(): ILoginState {
    return this.loginState.toDTO();
  }

  /**
   * The username of the logged-in user, or null if not logged in.
   */
  public get username(): string | null {
    return this.loginState.username;
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

  public toAccountDto(): IAccountDto<D> {
    return {
      ...this.account.toObject(),
      state: this.getLoginState(),
      data: this.getWebsiteData(),
      instanceCapabilities: {
        websiteDisplayName: this.decoratedProps.metadata.displayName,
        supports: this.getSupportedTypes(),
        fileOptions: cloneWebsiteFileOptions(this.decoratedProps.fileOptions),
      },
    } as IAccountDto<D>;
  }

  public syncAccount(account: Account, emit = true): void {
    if (account.id !== this.accountId || account.website !== this.account.website) {
      throw new Error('Cannot change the identity of a Website instance');
    }
    this.account = account;
    if (emit) {
      this.notifyAccountProjectionChanged();
    }
  }

  /**
   * Sets the website data provided by user or other means.
   * @param {D} data
   */
  public async setWebsiteData(data: D) {
    const changed = await this.websiteDataStore.setData(data, false);
    try {
      await this.onWebsiteDataChange(data);
    } finally {
      if (changed) {
        this.notifyAccountProjectionChanged();
      }
    }
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
   * Public entry point for a login check. Serialized via a mutex so only one
   * check runs at a time per instance:
   * - The first caller runs the full lifecycle (onBeforeLogin -> onLogin) and
   *   applies the result.
   * - Concurrent callers await the in-flight check and receive its result.
   *
   * There are no automatic retries — exactly one check runs per invocation.
   * A transient failure leaves the previous state intact (see
   * {@link executeLogin}); fresh checks are driven by newer triggers (cookie
   * changes and navigation events).
   *
   * @returns {Promise<ILoginState>} The login state after the check completes.
   */
  public async login(): Promise<ILoginState> {
    if (this.isDisposed) {
      return this.getLoginState();
    }
    // If a check is already running, await it and return its result rather than
    // starting a redundant concurrent check.
    if (this.loginMutex.isLocked()) {
      this.logger.debug(
        `Login already in progress for ${this.id}, awaiting result...`,
      );
      await this.loginMutex.waitForUnlock();
      return this.getLoginState();
    }

    return this.loginMutex.runExclusive(async () => {
      if (this.isDisposed) {
        return this.getLoginState();
      }
      const previous = this.loginState;
      this.loginState = this.loginState.beginCheck();
      this.notifyAccountProjectionChanged();
      try {
        const result = await this.executeLogin();
        this.loginState = this.loginState.resolve(result);
        this.notifyAccountProjectionChanged();
      } catch (e) {
        // Keep the previous state on failure: never flip a logged-in account to
        // logged-out due to a transient error, and never auto-retry.
        this.logger.withError(e).error(`Login failed for ${this.id}`);
        this.loginState = previous;
        this.notifyAccountProjectionChanged();
      }
      return this.getLoginState();
    });
  }

  /**
   * Runs the login lifecycle (onBeforeLogin -> onLogin) and returns the raw
   * result reported by the website. Errors propagate to {@link login}, which
   * decides how to apply them. Must only be called while holding the loginMutex.
   */
  private async executeLogin(): Promise<LoginResult> {
    try {
      await this.onBeforeLogin();
      return await this.onLogin();
    } finally {
      // Suppress cookie-change triggers briefly so the cookie writes performed
      // by our own onBeforeLogin don't re-trigger another login.
      this.suppressCookieChangeUntil =
        Date.now() + COOKIE_SELF_MUTATION_BUFFER_MS;
    }
  }

  // -------------- End Login Methods --------------

  // -------------- Event Methods --------------

  /**
   * Method that runs once on initialization of the Website class.
   */
  public async onInitialize(
    websiteDataRepository: WebsiteDataRepository,
    onWebsiteDataChanged?: (account: IAccountDto) => void,
  ): Promise<void> {
    this.onAccountProjectionChanged = onWebsiteDataChanged;
    await this.websiteDataStore.initialize(
      websiteDataRepository,
      () => this.notifyAccountProjectionChanged(),
    );
    this.subscribeToCookieChanges();
    this.notifyAccountProjectionChanged();
    this.startLoginRefresh();
  }

  private notifyAccountProjectionChanged(): void {
    if (!this.isDisposed) {
      this.onAccountProjectionChanged?.(this.toAccountDto());
    }
  }

  public dispose(): Promise<void> {
    if (!this.disposePromise) {
      this.disposed = true;
      if (this.loginRefreshTimer) {
        clearInterval(this.loginRefreshTimer);
        this.loginRefreshTimer = undefined;
      }
      this.unsubscribeFromCookieChanges();
      this.disposePromise = this.loginMutex.waitForUnlock();
    }
    return this.disposePromise;
  }

  public delete(): Promise<void> {
    if (!this.deletePromise) {
      this.deletePromise = (async () => {
        await this.dispose();
        const cleanupResults = await Promise.allSettled([
          this.platform.session.clearStorageData(this.accountId),
          this.onDelete(),
        ]);
        const cleanupErrors = cleanupResults.flatMap((result) =>
          result.status === 'rejected' ? [result.reason] : [],
        );
        if (cleanupErrors.length) {
          throw new AggregateError(
            cleanupErrors,
            `Failed to clean up Website instance '${this.id}'`,
          );
        }
      })();
    }
    return this.deletePromise;
  }

  protected async onDelete(): Promise<void> {
    // Optional implementation-specific cleanup.
  }

  private startLoginRefresh(): void {
    if (this.loginRefreshTimer) {
      clearInterval(this.loginRefreshTimer);
    }
    const refreshInterval =
      this.decoratedProps.metadata.refreshInterval ??
      DEFAULT_LOGIN_REFRESH_INTERVAL_MS;
    this.loginRefreshTimer = setInterval(() => {
      this.executeLoginRefresh();
    }, refreshInterval);
    this.executeLoginRefresh();
  }

  private executeLoginRefresh(): void {
    this.login().catch((error) => {
      this.logger.withError(error).error(`Login refresh failed for ${this.id}`);
    });
  }

  /**
   * Subscribes to cookie changes for this account's partition so login is
   * detected as soon as the website sets/updates its auth cookies, rather than
   * waiting for a navigation event. Only meaningful for
   * 'user' (webview) login flows; API/OAuth flows don't rely on webview
   * cookies.
   */
  private subscribeToCookieChanges(): void {
    if (this.decoratedProps.loginFlow.type !== 'user') {
      return;
    }
    // Guard against double-subscription if initialized more than once.
    this.unsubscribeFromCookieChanges();
    try {
      this.cookieChangeUnsubscribe = this.platform.session.onCookieChanged(
        this.accountId,
        (change) => this.handleCookieChange(change),
      );
    } catch (err) {
      this.logger.withError(err).warn('Failed to subscribe to cookie changes');
    }
  }

  /**
   * Reacts to a cookie change in this account's partition. Ignores cookies
   * unrelated to the website's domain and changes caused by our own login
   * lifecycle, then debounces the rest into a single login check.
   */
  private handleCookieChange(change: PlatformCookieChange): void {
    if (this.isDisposed) {
      return;
    }
    if (!this.isRelevantCookieDomain(change.cookie.domain)) {
      return;
    }

    if (this.cookieIgnoreList.includes(change.cookie.name)) {
      return;
    }

    // Ignore cookie mutations caused by our own login lifecycle to avoid a
    // feedback loop (onBeforeLogin writes/rehydrates session cookies).
    if (
      this.loginMutex.isLocked() ||
      Date.now() < this.suppressCookieChangeUntil
    ) {
      return;
    }

    if (this.cookieChangeDebounceTimer) {
      clearTimeout(this.cookieChangeDebounceTimer);
    }
    this.cookieChangeDebounceTimer = setTimeout(() => {
      this.cookieChangeDebounceTimer = undefined;
      this.logger.debug(
        `Cookie change detected for ${this.id}: '${change.cookie.name}', checking login`,
      );
      this.login().catch((e) =>
        this.logger.withError(e).error('Cookie-change login check failed'),
      );
    }, COOKIE_CHANGE_DEBOUNCE_MS);
  }

  /**
   * Determines whether a cookie domain is relevant to this website's BASE_URL.
   * Matches the base host, its subdomains, and parent domains so auth cookies
   * set on either the apex or a subdomain are picked up.
   */
  private isRelevantCookieDomain(cookieDomain?: string): boolean {
    if (!cookieDomain) {
      return false;
    }
    const normalized = cookieDomain.replace(/^\./, '').toLowerCase();
    try {
      const baseHost = new URL(this.BASE_URL).hostname.toLowerCase();
      return (
        baseHost === normalized ||
        baseHost.endsWith(`.${normalized}`) ||
        normalized.endsWith(`.${baseHost}`)
      );
    } catch {
      // If BASE_URL can't be parsed, don't filter — better to over-trigger.
      return true;
    }
  }

  /**
   * Tears down the cookie-change subscription and any pending debounce timer.
   */
  private unsubscribeFromCookieChanges(): void {
    if (this.cookieChangeDebounceTimer) {
      clearTimeout(this.cookieChangeDebounceTimer);
      this.cookieChangeDebounceTimer = undefined;
    }
    if (this.cookieChangeUnsubscribe) {
      try {
        this.cookieChangeUnsubscribe();
      } catch (err) {
        this.logger
          .withError(err)
          .warn('Failed to unsubscribe from cookie changes');
      }
      this.cookieChangeUnsubscribe = undefined;
    }
  }

  /**
   * Method that attempts to refresh expired cookies for user login flows.
   * This is a workaround to load the actual web page in the background to refresh cookies that may be expiring.
   */
  private async cycleCookies(): Promise<void> {
    if (this.decoratedProps.loginFlow.type === 'user') {
      this.logger.debug('Cycling cookies for user login flow');
      await this.platform.browser
        .ping(this.accountId, this.BASE_URL)
        .catch((err) => {
          this.logger.error('Error cycling cookies:', err);
        });
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
        const cookiesList = await this.platform.session.getCookies(
          this.accountId,
        );
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
            const setCookie: PlatformCookieDetails = {
              url: `${cookie.secure ? 'https' : 'http'}://${cookie.domain?.replace(/^\./, '')}${cookie.path}`,
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
            await this.platform.session.setCookie(this.accountId, setCookie);
            await this.platform.session.flushCookies(this.accountId);
          } else if (cookie.name.startsWith(CookiePrefix)) {
            const sessionCookieAlreadyPopulated = cookiesList.some(
              (c) => c.name === cookie.name.replace(CookiePrefix, ''),
            );
            if (!sessionCookieAlreadyPopulated) {
              this.logger.debug(
                `Rehydrating session cookie: ${cookie.name} (${cookie.domain})`,
              );
              const setCookie: PlatformCookieDetails = {
                url: `${cookie.secure ? 'https' : 'http'}://${cookie.domain?.replace(/^\./, '')}${cookie.path}`,
                name: cookie.name.replace(CookiePrefix, ''),
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
              };
              await this.platform.session.setCookie(this.accountId, setCookie);
              await this.platform.session.flushCookies(this.accountId);
            }
          }
        }
      }
    } catch (err) {
      this.logger
        .withError(err)
        .error('Error during onBeforeLogin cookie handling:');
    }
  }

  /**
   * Method that runs whenever a user closes the login page or on a scheduled interval.
   * Subclasses implement this to perform the actual login / session-validation logic.
   *
   * @protected - called internally by {@link login}.
   */
  protected abstract onLogin(): Promise<LoginResult>;

  // -------------- End Event Methods --------------
}

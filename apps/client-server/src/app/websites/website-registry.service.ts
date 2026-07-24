import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
  OnModuleDestroy,
    Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Account, AccountRepository, WebsiteDataRepository } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { PlatformService } from '@postybirb/platform';
import {
    DynamicObject,
    IAccount,
    IAccountDto,
    IWebsiteDefinitionDto,
    OAuthRoutes,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/common';
import { Class } from 'type-fest';
import { publishAccountStateChanged } from '../account/account.events';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import {
  cloneWebsiteFileOptions,
  validateWebsiteDecoratorProps,
} from './decorators/website-decorator-props';
import { OAuthWebsiteRequestDto } from './dtos/oauth-website-request.dto';
import DefaultWebsite from './implementations/default/default.website';
import { FileWebsiteKey } from './models/website-modifiers/file-website';
import { MessageWebsiteKey } from './models/website-modifiers/message-website';
import { OAuthWebsite } from './models/website-modifiers/oauth-website';
import { UnknownWebsite } from './website';

type WebsiteInstances = Record<string, Record<string, UnknownWebsite>>;

/**
 * A registry that contains reference to all Websites.
 * Creates a new instance for each user account provided.
 */
@Injectable()
export class WebsiteRegistryService implements OnModuleDestroy {
  private readonly logger = Logger();

  private readonly availableWebsites: Record<string, Class<UnknownWebsite>> =
    {};

  private readonly websiteInstances: WebsiteInstances = {};

  private readonly accountRepository: AccountRepository;

  private readonly websiteDataRepository: WebsiteDataRepository;

  private readonly initializingInstances = new Map<
    string,
    Promise<UnknownWebsite>
  >();

  private shuttingDown = false;

  private initialized = false;

  private initializedResolve: (() => void) | null = null;

  private readonly initializedPromise: Promise<void>;

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    private readonly platform: PlatformService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {
    this.initializedPromise = new Promise<void>((resolve) => {
      this.initializedResolve = resolve;
    });

    this.websiteImplementations.forEach((website) => {
      if (
        !validateWebsiteDecoratorProps(
          this.logger,
          website.name,
          website.prototype.decoratedProps,
        )
      ) {
        this.logger.error(`Failed to register website: ${website.name}`);
        return;
      }

      // this.logger.debug(
      //   `Registered website: ${website.prototype.decoratedProps.metadata.name}`,
      // );
      this.availableWebsites[website.prototype.decoratedProps.metadata.name] =
        website;
    });

    this.accountRepository = new AccountRepository();
    this.websiteDataRepository = new WebsiteDataRepository();
  }

  /**
   * Marks the website registry as initialized.
   * Called after all accounts have been loaded and website instances created.
   */
  public markAsInitialized(): void {
    this.initialized = true;
    if (this.initializedResolve) {
      this.initializedResolve();
      this.initializedResolve = null;
    }
    this.logger.info('Website registry marked as initialized');
  }

  /**
   * Returns whether the website registry has been initialized
   * (all accounts loaded and website instances created).
   * @returns {boolean} True if initialized
   */
  public isRegistryInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Returns a promise that resolves when the website registry is initialized.
   * If already initialized, resolves immediately.
   * @param {number} [timeoutMs] - Optional timeout in milliseconds
   * @returns {Promise<void>}
   */
  public async waitForInitialization(timeoutMs?: number): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (timeoutMs) {
      const timeout = new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error('Website registry initialization timed out')),
          timeoutMs,
        );
      });
      await Promise.race([this.initializedPromise, timeout]);
    } else {
      await this.initializedPromise;
    }
  }

  /**
   * Only used for unit testing.
   */
  getRepository() {
    if (IsTestEnvironment()) {
      return this.websiteDataRepository;
    }

    throw new Error('Test only method');
  }

  /**
   * Checks if the website is registered.
   *
   * @param {string} websiteName
   * @return {*}  {boolean}
   */
  public canCreate(websiteName: string): boolean {
    return Boolean(this.availableWebsites[websiteName]);
  }

  /**
   * Creates an instance of a Website associated with an Account.
   * @param {Account} account
   */
  public async create(account: Account): Promise<UnknownWebsite> {
    const { website, id } = account;
    if (this.shuttingDown) {
      throw new Error('Website registry is shutting down');
    }
    if (this.canCreate(account.website)) {
      const WebsiteCtor = this.availableWebsites[website];
      if (!this.websiteInstances[website]) {
        this.websiteInstances[website] = {};
      }

      const existing = this.websiteInstances[website][id];
      if (existing) {
        return existing;
      }
      const pending = this.initializingInstances.get(id);
      if (pending) {
        return pending;
      }

      const initialization = (async () => {
        const instance = new WebsiteCtor(account, this.platform);
        await instance.onInitialize(this.websiteDataRepository, (accountDto) => {
          if (!this.shuttingDown) {
            try {
              publishAccountStateChanged(this.eventEmitter, accountDto);
            } catch (error) {
              this.logger
                .withError(error)
                .error(`Failed to publish Account state for '${id}'`);
            }
          }
        });
        if (this.shuttingDown) {
          await instance.dispose();
        } else {
          this.websiteInstances[website][id] = instance;
        }
        return instance;
      })();
      this.initializingInstances.set(id, initialization);
      try {
        return await initialization;
      } finally {
        this.initializingInstances.delete(id);
      }
    }

    this.logger.error(`Unable to find website '${website}'`);
    throw new BadRequestException(`Unable to find website '${website}'`);
  }

  public async ensureInstance(account: Account): Promise<UnknownWebsite> {
    return this.findInstance(account) ?? this.create(account);
  }

  /**
   * Finds an existing Website instance.
   * @param {Account} account
   */
  public findInstance(account: IAccount): UnknownWebsite | undefined {
    const { website, id } = account;
    if (this.websiteInstances[website] && this.websiteInstances[website][id]) {
      return this.websiteInstances[website][id];
    }

    return undefined;
  }

  public getAccountDto(account: IAccount): IAccountDto {
    const instance = this.findInstance(account);
    if (!instance) {
      throw new Error(`No Website instance for Account '${account.id}'`);
    }
    return instance.toAccountDto();
  }

  public syncAccount(account: Account): IAccountDto {
    const instance = this.findInstance(account);
    if (!instance) {
      throw new Error(`No Website instance for Account '${account.id}'`);
    }
    instance.syncAccount(account);
    return instance.toAccountDto();
  }

  public async remove(account: IAccount): Promise<void> {
    try {
      let instance = this.findInstance(account);
      if (!instance) {
        try {
          instance = await this.initializingInstances.get(account.id);
        } catch (error) {
          this.logger
            .withError(error)
            .error(`Failed to await Website initialization for '${account.id}'`);
        }
      }
      if (instance) {
        await this.deleteInstance(instance, account.id);
      }
    } finally {
      if (this.websiteInstances[account.website]) {
        delete this.websiteInstances[account.website][account.id];
      }
    }
  }

  private async deleteInstance(
    instance: UnknownWebsite,
    accountId: string,
  ): Promise<void> {
    try {
      await instance.delete();
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Failed to clean up Website instance for Account '${accountId}'`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    const initializing = [...this.initializingInstances.values()];
    const initialized = this.getAll();
    const completed = await Promise.allSettled(initializing);
    const pendingInstances = completed.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    await Promise.allSettled(
      [...new Set([...initialized, ...pendingInstances])].map((instance) =>
        instance.dispose(),
      ),
    );
  }

  /**
   * Returns all created instances of a website.
   * @param {Class<UnknownWebsite>} website
   */
  public getInstancesOf(website: Class<UnknownWebsite>): UnknownWebsite[] {
    if (this.websiteInstances[website.prototype.decoratedProps.metadata.name]) {
      return Object.values(
        this.websiteInstances[website.prototype.decoratedProps.metadata.name],
      );
    }

    return [];
  }

  /**
   * Returns all website instances across all accounts.
   * @returns {UnknownWebsite[]}
   */
  public getAll(): UnknownWebsite[] {
    const all: UnknownWebsite[] = [];
    for (const instances of Object.values(this.websiteInstances)) {
      all.push(...Object.values(instances));
    }
    return all;
  }

  /**
   * Returns a list of all available websites.
   */
  public getAvailableWebsites(): Class<UnknownWebsite>[] {
    return Object.values(this.availableWebsites);
  }

  public getWebsiteDefinitions(): IWebsiteDefinitionDto[] {
    return this.getAvailableWebsites()
      .map((website) => {
        const { decoratedProps } = website.prototype;
        return {
          loginType: { ...decoratedProps.loginFlow },
          id: decoratedProps.metadata.name,
          displayName: decoratedProps.metadata.displayName,
          usernameShortcut: decoratedProps.usernameShortcut
            ? {
                id: decoratedProps.usernameShortcut.id,
                url: decoratedProps.usernameShortcut.url,
              }
            : undefined,
          metadata: { ...decoratedProps.metadata },
          fileOptions: cloneWebsiteFileOptions(decoratedProps.fileOptions),
          supportsFile: FileWebsiteKey in website.prototype,
          supportsMessage: MessageWebsiteKey in website.prototype,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Runs an authorization step for a website.
   * @param {OAuthWebsiteRequestDto<unknown>} oauthRequestDto
   */
  public async performOAuthStep(
    oauthRequestDto: OAuthWebsiteRequestDto<DynamicObject>,
  ) {
    this.logger.info(`OAuth website route for '${oauthRequestDto.id}'`);

    const account = await this.accountRepository.findByIdOrThrow(oauthRequestDto.id);
    const instance = this.findInstance(account);

    if (!instance) throw new NotFoundException('Website instance not found.');

    if ('onAuthRoute' in (instance as unknown as OAuthWebsite<OAuthRoutes>)) {
      const routes = (instance as unknown as OAuthWebsite<OAuthRoutes>)
        .onAuthRoute;

      return routes[oauthRequestDto.route](oauthRequestDto.data);
    }

    throw new BadRequestException('Website does not support OAuth operations.');
  }

  /**
   * Creates a transient default website instance with platform context wired up.
   * Used for non-registered (default) website options.
   */
  public createDefaultWebsiteInstance(account: Account): DefaultWebsite {
    return new DefaultWebsite(account, this.platform);
  }
}

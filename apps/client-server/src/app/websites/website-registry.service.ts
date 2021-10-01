import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Account } from '../account/entities/account.entity';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Ctor } from '../shared/interfaces/constructor.interface';
import { UnknownWebsite } from './website';

type WebsiteInstances = Record<string, Record<string, UnknownWebsite>>;

/**
 * A registry that contains reference to all Websites.
 * Creates a new instance for each user account provided.
 */
@Injectable()
export class WebsiteRegistryService implements OnModuleInit {
  private readonly logger: Logger = new Logger(WebsiteRegistryService.name);

  private readonly availableWebsites: Record<string, Ctor<UnknownWebsite>> = {};

  private readonly websiteInstances: WebsiteInstances = {};

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Ctor<UnknownWebsite>[]
  ) {}

  onModuleInit() {
    Object.values({ ...this.websiteImplementations }).forEach(
      (website: Ctor<UnknownWebsite>) => {
        if (!website.prototype.metadata.name) {
          throw new Error(`${website.name} is missing metadata field "name"`);
        }

        this.logger.verbose(
          `Registering website: ${website.prototype.metadata.name}`
        );
        this.availableWebsites[website.prototype.metadata.name] = website;
      }
    );
  }

  /**
   * Creates an instance of a Website associated with an Account.
   * @param {Account} account
   */
  public async create(account: Account): Promise<UnknownWebsite | undefined> {
    const { name, id } = account;
    if (this.availableWebsites[name]) {
      const websiteCtor = this.availableWebsites[name];
      if (!this.websiteInstances[name]) {
        this.websiteInstances[name] = {};
      }

      if (!this.websiteInstances[name][id]) {
        this.logger.log(`Creating instance of "${name}" with id "${id}"`);
        this.websiteInstances[name][id] = new websiteCtor(account);
        await this.websiteInstances[name][id].onInitialize();
      } else {
        this.logger.warn(
          `An instance of "${name}" with id "${id}" already exists`
        );
      }

      return this.websiteInstances[name][id];
    } else {
      this.logger.error(`Unable to find website name "${name}"`);
    }
  }

  /**
   * Finds an existing Website instance.
   * @param {Account} account
   */
  public findInstance(account: Account): UnknownWebsite | undefined {
    const { name, id } = account;
    if (this.websiteInstances[name] && this.websiteInstances[name][id]) {
      return this.websiteInstances[name][id];
    }
  }

  /**
   * Returns all created instances of a website.
   * @param {Ctor<UnknownWebsite>} website
   */
  public getInstancesOf(website: Ctor<UnknownWebsite>): UnknownWebsite[] {
    return Object.values(
      this.websiteInstances[website.prototype.metadata.name]
    );
  }

  /**
   * Returns a list of all available websites.
   */
  public getAvailableWebsites(): Ctor<UnknownWebsite>[] {
    return Object.values(this.availableWebsites);
  }

  /**
   * Removes an instance of a Website.
   * Cleans up login, stored, and cache data.
   * @param {Account} account
   */
  public async remove(account: Account): Promise<void> {
    const { name, id, website } = account;
    const instance = this.findInstance(account);
    if (instance) {
      this.logger.verbose(
        `Removing and cleaning up ${website} - ${name} - ${id}`
      );
      await instance.clearLoginStateAndData();
      delete this.websiteInstances[name][id];
    }
  }
}

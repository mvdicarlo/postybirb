import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Account } from '../account/entities/account.entity';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Ctor } from '../shared/interfaces/constructor.interface';
import { SafeObject } from '../shared/types/safe-object.type';
import { OAuthWebsiteRequestDto } from './dtos/oauth-website-request.dto';
import { OAuthWebsite } from './models/oauth-website.interface';
import { UnknownWebsite } from './website';

type WebsiteInstances = Record<string, Record<string, UnknownWebsite>>;

/**
 * A registry that contains reference to all Websites.
 * Creates a new instance for each user account provided.
 */
@Injectable()
export class WebsiteRegistryService {
  private readonly logger: Logger = new Logger(WebsiteRegistryService.name);

  private readonly availableWebsites: Record<string, Ctor<UnknownWebsite>> = {};

  private readonly websiteInstances: WebsiteInstances = {};

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Ctor<UnknownWebsite>[]
  ) {
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
  public async create(account: Account): Promise<UnknownWebsite | undefined> {
    const { website, id } = account;
    if (this.canCreate(account.website)) {
      const websiteCtor = this.availableWebsites[website];
      if (!this.websiteInstances[website]) {
        this.websiteInstances[website] = {};
      }

      if (!this.websiteInstances[website][id]) {
        this.logger.log(`Creating instance of "${website}" with id "${id}"`);
        this.websiteInstances[website][id] = new websiteCtor(account);
        await this.websiteInstances[website][id].onInitialize();
      } else {
        this.logger.warn(
          `An instance of "${website}" with id "${id}" already exists`
        );
      }

      return this.websiteInstances[website][id];
    } else {
      this.logger.error(`Unable to find website "${website}"`);
    }
  }

  /**
   * Finds an existing Website instance.
   * @param {Account} account
   */
  public findInstance(account: Account): UnknownWebsite | undefined {
    const { website, id } = account;
    if (this.websiteInstances[website] && this.websiteInstances[website][id]) {
      return this.websiteInstances[website][id];
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
      delete this.websiteInstances[website][id];
    }
  }

  /**
   * Runs an authorization step for a website.
   * @todo better type overlap
   * @param {OAuthWebsiteRequestDto<unknown>} oauthRequestDto
   */
  public performOAuthStep(oauthRequestDto: OAuthWebsiteRequestDto<SafeObject>) {
    const instance = this.findInstance(oauthRequestDto as unknown as Account);
    if (Object.prototype.hasOwnProperty.call(oauthRequestDto, 'onAuthorize')) {
      return (instance as unknown as OAuthWebsite).onAuthorize(
        oauthRequestDto.data,
        oauthRequestDto.state
      );
    }

    throw new BadRequestException('Website does not support OAuth operations.');
  }
}

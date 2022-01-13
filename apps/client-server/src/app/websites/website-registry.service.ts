import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { Repository } from 'typeorm';
import { Class } from 'type-fest';
import { Account } from '../account/entities/account.entity';
import { WEBSITE_DATA_REPOSITORY, WEBSITE_IMPLEMENTATIONS } from '../constants';
import { SafeObject } from '../shared/types/safe-object.type';
import { OAuthWebsiteRequestDto } from './dtos/oauth-website-request.dto';
import { WebsiteData } from './entities/website-data.entity';
import { OAuthWebsite } from './models/website-modifier-interfaces/oauth-website.interface';
import { UnknownWebsite } from './website';

type WebsiteInstances = Record<string, Record<string, UnknownWebsite>>;

/**
 * A registry that contains reference to all Websites.
 * Creates a new instance for each user account provided.
 */
@Injectable()
export class WebsiteRegistryService {
  private readonly logger = Logger(WebsiteRegistryService.name);

  private readonly availableWebsites: Record<string, Class<UnknownWebsite>> =
    {};

  private readonly websiteInstances: WebsiteInstances = {};

  constructor(
    @Inject(WEBSITE_DATA_REPOSITORY)
    private readonly websiteDataRepository: Repository<WebsiteData<SafeObject>>,
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[]
  ) {
    Object.values({ ...this.websiteImplementations }).forEach(
      (website: Class<UnknownWebsite>) => {
        if (!website.prototype.metadata.name) {
          throw new Error(`${website.name} is missing metadata field "name"`);
        }

        this.logger.debug(
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
      const WebsiteCtor = this.availableWebsites[website];
      if (!this.websiteInstances[website]) {
        this.websiteInstances[website] = {};
      }

      if (!this.websiteInstances[website][id]) {
        this.logger.info(`Creating instance of "${website}" with id "${id}"`);
        this.websiteInstances[website][id] = new WebsiteCtor(account);
        await this.websiteInstances[website][id].onInitialize(
          this.websiteDataRepository
        );
      } else {
        this.logger.warn(
          `An instance of "${website}" with id "${id}" already exists`
        );
      }

      return this.websiteInstances[website][id];
    }

    this.logger.error(`Unable to find website "${website}"`);
    return undefined;
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

    return undefined;
  }

  /**
   * Returns all created instances of a website.
   * @param {Class<UnknownWebsite>} website
   */
  public getInstancesOf(website: Class<UnknownWebsite>): UnknownWebsite[] {
    if (this.websiteInstances[website.prototype.metadata.name]) {
      return Object.values(
        this.websiteInstances[website.prototype.metadata.name]
      );
    }

    return [];
  }

  /**
   * Returns a list of all available websites.
   */
  public getAvailableWebsites(): Class<UnknownWebsite>[] {
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
      this.logger.info(`Removing and cleaning up ${website} - ${name} - ${id}`);
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
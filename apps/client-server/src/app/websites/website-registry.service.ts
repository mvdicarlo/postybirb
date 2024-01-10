import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { WEBSITE_UPDATES } from '@postybirb/socket-events';
import { DynamicObject, IAccount, IWebsiteInfoDto } from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Account, WebsiteData } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { IsTestEnvironment } from '../utils/test.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { OAuthWebsiteRequestDto } from './dtos/oauth-website-request.dto';
import { OAuthWebsite } from './models/website-modifiers/oauth-website';
import { UnknownWebsite } from './website';

type WebsiteInstances = Record<string, Record<string, UnknownWebsite>>;

/**
 * A registry that contains reference to all Websites.
 * Creates a new instance for each user account provided.
 */
@Injectable()
export class WebsiteRegistryService {
  private readonly logger = Logger();

  private readonly availableWebsites: Record<string, Class<UnknownWebsite>> =
    {};

  private readonly websiteInstances: WebsiteInstances = {};

  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(WebsiteData)
    private readonly websiteDataRepository: PostyBirbRepository<
      WebsiteData<DynamicObject>
    >,
    @InjectRepository(Account)
    private readonly accountRepository: PostyBirbRepository<Account>,
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    @Optional() private readonly webSocket?: WSGateway
  ) {
    this.logger.debug('Registering websites');
    Object.values({ ...this.websiteImplementations }).forEach(
      (website: Class<UnknownWebsite>) => {
        if (!website.prototype.metadata.name) {
          throw new Error(`${website.name} is missing metadata field 'name'`);
        }

        if (
          !website.prototype.loginUrl &&
          !website.prototype.loginComponentName
        ) {
          this.logger.warn(
            `${website.name} is missing a login method. Please apply the UserLoginWebsite or CustomLoginWebsite interface.`
          );
        }

        this.logger.debug(
          `Registered website: ${website.prototype.metadata.name}`
        );
        this.availableWebsites[website.prototype.metadata.name] = website;
      }
    );
    accountRepository.addUpdateListener(
      dbSubscriber,
      [Account, WebsiteData],
      () => this.emit()
    );
  }

  private async emit() {
    if (this.webSocket) {
      this.webSocket.emit({
        event: WEBSITE_UPDATES,
        data: await this.getWebsiteInfo(),
      });
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
  public async create(account: IAccount): Promise<UnknownWebsite> {
    const { website, id } = account;
    if (this.canCreate(account.website)) {
      const WebsiteCtor = this.availableWebsites[website];
      if (!this.websiteInstances[website]) {
        this.websiteInstances[website] = {};
      }

      if (!this.websiteInstances[website][id]) {
        this.logger.info(`Creating instance of '${website}' with id '${id}'`);
        this.websiteInstances[website][id] = new WebsiteCtor(account);
        await this.websiteInstances[website][id].onInitialize(
          this.websiteDataRepository
        );
      } else {
        this.logger.warn(
          `An instance of "${website}" with id '${id}' already exists`
        );
      }

      return this.websiteInstances[website][id];
    }

    this.logger.error(`Unable to find website '${website}'`);
    throw new BadRequestException(`Unable to find website '${website}'`);
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
   * Returns a list of all available websites for UI.
   * @return {*}  {Promise<IWebsiteInfoDto[]>}
   */
  public async getWebsiteInfo(): Promise<IWebsiteInfoDto[]> {
    const dtos: IWebsiteInfoDto[] = [];

    const availableWebsites = this.getAvailableWebsites();
    // eslint-disable-next-line no-restricted-syntax
    for (const website of availableWebsites) {
      const accounts = await this.accountRepository.find({
        website: website.prototype.metadata.name,
      });
      dtos.push({
        loginType: website.prototype.loginType,
        id: website.prototype.metadata.name,
        displayName: website.prototype.metadata.displayName,
        usernameShortcut: website.prototype.usernameShortcut,
        metadata: website.prototype.metadata,
        accounts: accounts.map((account) => {
          const instance = this.findInstance(account);
          if (instance) {
            // eslint-disable-next-line no-param-reassign
            account.data = instance.getWebsiteData();

            // eslint-disable-next-line no-param-reassign
            account.state = instance.getLoginState();

            // eslint-disable-next-line no-param-reassign
            account.websiteInfo = {
              websiteDisplayName:
                instance.metadata.displayName || instance.metadata.name,
              supports: instance.getSupportedTypes(),
            };
          }

          return account.toJSON();
        }),
      });
    }

    return dtos.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Removes an instance of a Website.
   * Cleans up login, stored, and cache data.
   * @param {Account} account
   */
  public async remove(account: IAccount): Promise<void> {
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
  public performOAuthStep(
    oauthRequestDto: OAuthWebsiteRequestDto<DynamicObject>
  ) {
    const instance = this.findInstance(oauthRequestDto as unknown as IAccount);
    if (Object.prototype.hasOwnProperty.call(oauthRequestDto, 'onAuthorize')) {
      return (instance as unknown as OAuthWebsite).onAuthorize(
        oauthRequestDto.data,
        oauthRequestDto.state
      );
    }

    throw new BadRequestException('Website does not support OAuth operations.');
  }
}

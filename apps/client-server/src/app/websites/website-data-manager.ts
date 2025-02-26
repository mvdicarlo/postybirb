import { Logger, PostyBirbLogger } from '@postybirb/logger';
import { DynamicObject, IAccount } from '@postybirb/types';
import { WebsiteData } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';

/**
 * Saves website specific data associated with an account.
 *
 * @class WebsiteDataManager
 */
export default class WebsiteDataManager<T extends DynamicObject> {
  private readonly logger: PostyBirbLogger;

  private readonly account: IAccount;

  private entity: WebsiteData<T>;

  private initialized: boolean;

  private repository: PostyBirbDatabase<'WebsiteDataSchema'>;

  constructor(userAccount: IAccount) {
    this.account = userAccount;
    this.logger = Logger();
    this.initialized = false;
  }

  private async createOrLoadWebsiteData() {
    let entity: WebsiteData = await this.repository.findById(this.account.id);

    if (!entity) {
      entity = await this.repository.insert({
        id: this.account.id,
      });
    }

    this.entity = entity;
  }

  private async saveData() {
    await this.repository.update(this.entity.id, {
      data: this.entity.data,
    });
  }

  /**
   * Initializes the internal WebsiteData entity.
   * @param {PostyBirbDatabase<'WebsiteDataSchema'>} repository
   */
  public async initialize(repository: PostyBirbDatabase<'WebsiteDataSchema'>) {
    if (!this.initialized) {
      this.repository = repository;
      await this.createOrLoadWebsiteData();
      this.initialized = true;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Deletes the internal WebsiteData entity and creates a new one.
   */
  public async clearData(recreateEntity = true) {
    this.logger.info('Clearing website data');
    await this.repository.deleteById([this.entity.id]);

    if (recreateEntity) {
      // Do a reload to recreate an object that hasn't been saved.
      await this.createOrLoadWebsiteData();
    }
  }

  /**
   * Returns stored WebsiteData.
   *
   * @return {*}  {T}
   * @memberof WebsiteDataManager
   */
  public getData(): T {
    if (!this.initialized) {
      return {} as T;
    }

    return { ...this.entity.data };
  }

  /**
   * Sets WebsiteData value.
   * @param {T} data
   */
  public async setData(data: T) {
    if (JSON.stringify(data) !== JSON.stringify(this.entity.data)) {
      this.entity.data = { ...data };
      await this.saveData();
    }
  }
}

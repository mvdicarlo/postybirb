import { Logger } from '@postybirb/logger';
import { Repository } from 'typeorm';
import { Account } from '../account/entities/account.entity';
import { SafeObject } from '../shared/types/safe-object.type';
import { WebsiteData } from './entities/website-data.entity';

/**
 * Saves website specific data associated with an account.
 *
 * @class WebsiteDataManager
 */
export default class WebsiteDataManager<T extends SafeObject> {
  private readonly logger;

  private readonly account: Account;
  private entity: WebsiteData<T>;
  private initialized: boolean;
  private repository: Repository<WebsiteData<T>>;

  constructor(userAccount: Account) {
    this.account = userAccount;
    this.logger = Logger(
      `WebsiteData[${userAccount.website}:${userAccount.id}]`
    );
    this.initialized = false;
  }

  private async loadData() {
    let entity: WebsiteData<T> = {} as WebsiteData<T>;
    try {
      entity = await this.repository.findOneOrFail(this.account.id);
    } catch {
      entity = this.repository.create({ id: this.account.id });
      entity.data = {} as T;
    }

    this.entity = entity;
  }

  private async saveData() {
    await this.repository.save<WebsiteData<any>>(this.entity);
  }

  public async initialize(repository: Repository<WebsiteData<T>>) {
    if (!this.initialized) {
      this.repository = repository;
      this.initialized = true;
      await this.loadData();
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async clearData() {
    this.logger.info('Clearing website data');
    await this.repository.delete(this.account.id);

    // Do a reload to recreate an object that hasn't been saved.
    await this.loadData();
  }

  public getData(): T {
    return { ...this.entity.data };
  }

  public async setData(data: T) {
    if (JSON.stringify(data) !== JSON.stringify(this.entity.data)) {
      this.entity.data = { ...data };
      await this.saveData();
    }
  }
}

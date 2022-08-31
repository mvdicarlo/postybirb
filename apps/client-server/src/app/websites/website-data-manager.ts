import { EntityRepository } from '@mikro-orm/core';
import { Logger } from '@postybirb/logger';
import { IAccount } from '../account/models/account';
import { WebsiteData } from '../database/entities';
import { SafeObject } from '../shared/types/safe-object';

/**
 * Saves website specific data associated with an account.
 *
 * @class WebsiteDataManager
 */
export default class WebsiteDataManager<T extends SafeObject> {
  private readonly logger;

  private readonly account: IAccount;

  private entity: WebsiteData<T>;

  private initialized: boolean;

  private repository: EntityRepository<WebsiteData<T>>;

  constructor(userAccount: IAccount) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.persistAndFlush(this.entity);
  }

  public async initialize(repository: EntityRepository<WebsiteData<T>>) {
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
    await this.repository.removeAndFlush(this.entity);

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

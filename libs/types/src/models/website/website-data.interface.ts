import { IEntity } from '../database/entity.interface';
import { SafeObject } from '../common/safe-object';
import { AccountId } from '../account/account.type';

/**
 * Represents data associated with a website.
 * @interface IWebsiteData
 * @template T - The type of data associated with the website.
 * @extends {IEntity}
 */
export interface IWebsiteData<T extends SafeObject> extends IEntity {
  /**
   * The ID of the associated account.
   * @type {AccountId}
   * @memberof IWebsiteData
   */
  id: AccountId;
  /**
   * The data associated with the website.
   * @type {T}
   * @memberof IWebsiteData
   */
  data: T;
}

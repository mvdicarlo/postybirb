import { IEntity } from '../database/entity.interface';
import { SafeObject } from '../common/safe-object';
import { AccountId } from '../account/account.type';

/**
 * Represents data associated with a website.
 * @interface IWebsiteData
 * @template T - The type of data associated with the website.
 * @extends {IEntity}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IWebsiteData<T extends SafeObject = any> extends IEntity {
  /**
   * The ID of the associated account.
   * @type {AccountId}
   */
  id: AccountId;
  /**
   * The data associated with the website.
   * @type {T}
   */
  data: T;
}
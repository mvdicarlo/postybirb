import { DynamicObject } from '../common/dynamic-object';
import { IEntity } from '../database/entity.interface';

/**
 * Represents data associated with a website.
 * @interface IWebsiteData
 * @template T - The type of data associated with the website.
 * @extends {IEntity}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IWebsiteData<T extends DynamicObject = any> extends IEntity {
  /**
   * The data associated with the website.
   * @type {T}
   */
  data: T;
}

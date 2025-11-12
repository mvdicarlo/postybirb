import { IEntity } from '../database/entity.interface';
import { WebsiteId } from '../website/website.type';

/**
 * Represents a User Converter.
 * @interface IUserConverter
 * @extends {IEntity}
 */
export interface IUserConverter extends IEntity {
  /**
   * The username to convert.
   * @type {string}
   */
  username: string;

  /**
   * The website to username conversion.
   * @type {Record<WebsiteId, string>}
   */
  convertTo: Record<WebsiteId, string>;
}

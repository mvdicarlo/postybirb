import { IBaseEntity } from './base-entity';

export interface ITagConverter extends IBaseEntity {
  /**
   * The tag to convert.
   * @type {string}
   */
  tag: string;

  /**
   * The website to tag conversion.
   * @type {Record<string, string>}
   */
  convertTo: Record<string, string>;
}

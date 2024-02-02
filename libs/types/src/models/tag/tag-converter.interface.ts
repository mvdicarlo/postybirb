import { IEntity } from '../database/entity.interface';
import { WebsiteId } from '../website/website.type';
import { Tag } from './tag.type';

/**
 * Represents a Tag Converter.
 * @interface ITagConverter
 * @extends {IEntity}
 */
export interface ITagConverter extends IEntity {
  /**
   * The tag to convert.
   * @type {Tag}
   */
  tag: Tag;

  /**
   * The website to tag conversion.
   * @type {Record<WebsiteId, Tag>}
   */
  convertTo: Record<WebsiteId, Tag>;
}

import { IEntity } from '../database/entity.interface';
import { Tag } from './tag.type';

/**
 * Represents a Tag Group.
 * @interface ITagGroup
 * @extends {IEntity}
 */
export interface ITagGroup extends IEntity {
  /**
   * User provided name of a tag group.
   * @type {string}
   */
  name: string;

  /**
   * Tags for the tag group.
   * @type {Tag[]}
   */
  tags: Tag[];
}

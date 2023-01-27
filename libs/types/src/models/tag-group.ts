import { IBaseEntity } from './base-entity';

export interface ITagGroup extends IBaseEntity {
  /**
   * Id for a tag group.
   * @type {string}
   */
  id: string;

  /**
   * User provided name of a tag group.
   * @type {string}
   */
  name: string;

  /**
   * Tags for the tag group.
   * @type {string[]}
   */
  tags: string[];
}

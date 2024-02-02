import { Tag } from './tag.type';

/**
 * Represents a set of tag values that may override the default values.
 * @typedef {Object} TagValue
 * @property {boolean} overrideDefault - Whether the default values should be overridden.
 * @property {Tag[]} tags - The tag values.
 */
export type TagValue = {
  /**
   * Whether the default values should be overridden.
   * @type {boolean}
   */
  overrideDefault: boolean;
  /**
   * The tag values.
   * @type {Tag[]}
   */
  tags: Tag[];
};

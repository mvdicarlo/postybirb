/**
 * An object representing a description value.
 * @typedef {Object} DescriptionValue
 * @property {boolean} overrideDefault - Indicates whether the default description is overridden.
 * @property {string} description - The description value.
 */
export type DescriptionValue = {
  /**
   * Indicates whether the default description is overridden.
   * @type {boolean}
   */
  overrideDefault: boolean;

  /**
   * The description value.
   * @type {string}
   */
  description: string;
};

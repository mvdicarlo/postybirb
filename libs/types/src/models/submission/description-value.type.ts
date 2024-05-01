import { Block } from '@blocknote/core';

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
   * @type {Description}
   */
  description: Description;
};

export type Description = Block[];

export const DefaultDescription = (): Description => [];

/** Default tag value @type {DescriptionValue} */
export const DefaultDescriptionValue = (): DescriptionValue => ({
  overrideDefault: false,
  description: DefaultDescription(),
});

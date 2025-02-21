import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
} from '@blocknote/core';

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
   * Indicates whether the tags should be inserted at the end of the description.
   * @type {boolean}
   */
  insertTags?: boolean;

  /**
   * Indicates whether the title should be inserted at the beginning of the description.
   * @type {boolean}
   */
  insertTitle?: boolean;

  /**
   * The description value.
   * @type {Description}
   */
  description: Description;
};

type CustomInlineContentSchema = DefaultInlineContentSchema & {
  username: {
    type: 'username';
    propSchema: {
      id: {
        default: string;
      };
      shortcut: {
        default: string;
      };
      only: {
        default: string;
      };
    };
    content: 'styled';
  };
};

export type Description = Block<
  DefaultBlockSchema,
  CustomInlineContentSchema
>[];

export const DefaultDescription = (): Description => [];

/** Default tag value @type {DescriptionValue} */
export const DefaultDescriptionValue = (): DescriptionValue => ({
  overrideDefault: false,
  description: DefaultDescription(),
  insertTags: undefined,
  insertTitle: undefined,
});

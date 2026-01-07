/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Block,
  BlockSchemaFromSpecs,
  BlockSpec,
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
  customShortcut: {
    type: 'customShortcut';
    propSchema: {
      id: {
        default: string;
      };
    };
    content: 'styled';
  };
};

type DefaultBlock = BlockSpec<
  'defaultShortcut',
  {
    default: {
      default: undefined;
      type: 'string';
    };
  },
  'none'
>;

type CustomBlockContentSchema = DefaultBlockSchema &
  BlockSchemaFromSpecs<{ defaultShortcut: DefaultBlock }>;

export type Description = Block<
  CustomBlockContentSchema,
  CustomInlineContentSchema
>[];

export const DefaultDescription = (): Description => [];

/** Default description value @type {DescriptionValue} */
export const DefaultDescriptionValue = (): DescriptionValue => ({
  overrideDefault: false,
  description: DefaultDescription(),
  insertTags: undefined,
  insertTitle: undefined,
});

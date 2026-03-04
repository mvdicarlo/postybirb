/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A mark applied to a text node in TipTap JSON (bold, italic, link, etc.).
 */
export interface TipTapMark {
  type: string;
  attrs?: Record<string, any>;
}

/**
 * A node in TipTap's JSON document structure.
 * Can be a block (paragraph, heading), inline (custom shortcut), or text node.
 */
export interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

/**
 * A TipTap JSON document — the root wrapper for editor content.
 */
export interface TipTapDoc {
  type: 'doc';
  content: TipTapNode[];
}

/**
 * The description content stored for a submission.
 * Uses TipTap's native JSON document format.
 */
export type Description = TipTapDoc;

export const DefaultDescription = (): Description => ({
  type: 'doc',
  content: [],
});

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

/** Default description value @type {DescriptionValue} */
export const DefaultDescriptionValue = (): DescriptionValue => ({
  overrideDefault: false,
  description: DefaultDescription(),
  insertTags: undefined,
  insertTitle: undefined,
});

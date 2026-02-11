/* eslint-disable @typescript-eslint/no-explicit-any */
import { TipTapMark, TipTapNode } from '@postybirb/types';

/**
 * Re-export TipTap types from the shared types library for use in the server parser.
 */
export type { TipTapMark, TipTapNode };

/**
 * A TipTap node used as a block-level element (paragraph, heading, list, etc.).
 * In TipTap, block nodes have `type`, optional `attrs`, and optional `content`.
 */
export interface ITipTapBlockNode extends TipTapNode {
  attrs?: Record<string, any>;
  content?: TipTapNode[];
}

/**
 * A TipTap text node. Has `type: 'text'`, `text`, and optional `marks`.
 */
export interface ITipTapTextNode extends TipTapNode {
  type: 'text';
  text: string;
  marks?: TipTapMark[];
}

/**
 * Known block-level node types in TipTap.
 */
export const BlockTypes: string[] = [
  'doc',
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'horizontalRule',
  'hardBreak',
  'image',
  'defaultShortcut',
];

/**
 * Known inline/atom node types in TipTap (rendered inline, not block-level).
 */
export const InlineTypes: string[] = [
  'username',
  'customShortcut',
  'titleShortcut',
  'tagsShortcut',
  'contentWarningShortcut',
];

/**
 * Helper to check if a TipTap node is a text node.
 */
export function isTextNode(node: TipTapNode): node is ITipTapTextNode {
  return node.type === 'text' && typeof (node as any).text === 'string';
}

/**
 * Helper to check if a TipTap node is an inline shortcut node.
 */
export function isInlineShortcut(node: TipTapNode): boolean {
  return InlineTypes.includes(node.type);
}

/**
 * Helper to check if a text node has a specific mark.
 */
export function hasMark(node: ITipTapTextNode, markType: string): boolean {
  return node.marks?.some((m) => m.type === markType) ?? false;
}

/**
 * Helper to get a mark's attrs from a text node.
 */
export function getMarkAttrs(
  node: ITipTapTextNode,
  markType: string,
): Record<string, any> | undefined {
  return node.marks?.find((m) => m.type === markType)?.attrs;
}

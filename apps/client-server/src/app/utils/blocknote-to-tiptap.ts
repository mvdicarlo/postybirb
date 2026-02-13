/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@postybirb/logger';
import { Description, TipTapMark, TipTapNode } from '@postybirb/types';

const logger = Logger();

/**
 * BlockNote block shape (old format):
 * {
 *   id: string,
 *   type: string,
 *   props: Record<string, any>,
 *   content: Array<{ type: 'text', text: string, styles: Record<string, any> }
 *                 | { type: 'link', href: string, content: [...textNodes] }
 *                 | { type: string, props: Record<string, any> }>,
 *   children: Block[]
 * }
 */

interface BNTextNode {
  type: 'text';
  text: string;
  styles?: Record<string, any>;
}

interface BNLinkNode {
  type: 'link';
  href: string;
  content: BNTextNode[];
}

interface BNInlineNode {
  type: string;
  props?: Record<string, any>;
}

type BNInlineContent = BNTextNode | BNLinkNode | BNInlineNode;

interface BNBlock {
  id?: string;
  type: string;
  props?: Record<string, any>;
  content?: BNInlineContent[] | 'none' | string;
  children?: BNBlock[];
}

// Default props that BlockNote includes but are meaningless — strip them
const DEFAULT_PROP_VALUES: Record<string, any> = {
  textColor: 'default',
  backgroundColor: 'default',
  textAlignment: 'left',
  level: 1,
};

/**
 * Returns true if the value is a BlockNote-format description (old format).
 * BlockNote descriptions are stored as an array of blocks.
 * TipTap descriptions are stored as { type: 'doc', content: [...] }.
 */
export function isBlockNoteFormat(desc: unknown): desc is BNBlock[] {
  return Array.isArray(desc);
}

/**
 * Convert BlockNote styles object to TipTap marks array.
 * e.g. { bold: true, italic: true, textColor: '#ff0000' }
 * → [{ type: 'bold' }, { type: 'italic' }, { type: 'textColor', attrs: { color: '#ff0000' } }]
 */
function convertStyles(styles: Record<string, any>): TipTapMark[] {
  const marks: TipTapMark[] = [];
  for (const [key, value] of Object.entries(styles)) {
    if (value === false || value === undefined || value === null) {
      continue;
    }
    switch (key) {
      case 'bold':
      case 'italic':
      case 'strike':
      case 'underline':
      case 'code':
        if (value === true) {
          marks.push({ type: key });
        }
        break;
      case 'textColor':
        if (value && value !== 'default') {
          marks.push({ type: 'textStyle', attrs: { color: value } });
        }
        break;
      case 'backgroundColor':
        if (value && value !== 'default') {
          marks.push({ type: 'highlight', attrs: { color: value } });
        }
        break;
      default:
        // Unknown style — preserve as-is
        if (value === true) {
          marks.push({ type: key });
        } else {
          marks.push({ type: key, attrs: { value } });
        }
        break;
    }
  }
  return marks;
}

/**
 * Convert a BlockNote inline content node to TipTap inline nodes.
 * - text → { type: 'text', text, marks }
 * - link → text nodes with link mark added
 * - custom inline shortcuts → { type, attrs }
 */
function convertInlineContent(
  inlineNode: BNInlineContent,
): TipTapNode[] {
  if (inlineNode.type === 'text') {
    const bn = inlineNode as BNTextNode;
    const node: TipTapNode = { type: 'text', text: bn.text };
    if (bn.styles && Object.keys(bn.styles).length > 0) {
      const marks = convertStyles(bn.styles);
      if (marks.length > 0) {
        node.marks = marks;
      }
    }
    return [node];
  }

  if (inlineNode.type === 'link') {
    const bn = inlineNode as BNLinkNode;
    const linkMark: TipTapMark = {
      type: 'link',
      attrs: { href: bn.href, target: '_blank', rel: 'noopener noreferrer nofollow' },
    };
    // Each text node inside the link gets the link mark added
    return (bn.content || []).flatMap((textNode) => {
      const converted = convertInlineContent(textNode);
      return converted.map((n) => {
        if (n.type === 'text') {
          const existing = n.marks || [];
          return { ...n, marks: [...existing, linkMark] };
        }
        return n;
      });
    });
  }

  // Custom inline nodes: customShortcut, titleShortcut, tagsShortcut,
  // contentWarningShortcut, username
  const bn = inlineNode as BNInlineNode;
  const attrs: Record<string, any> = {};
  if (bn.props) {
    for (const [key, value] of Object.entries(bn.props)) {
      if (value !== undefined && value !== null && value !== '') {
        attrs[key] = value;
      }
    }
  }
  const node: TipTapNode = { type: bn.type };
  if (Object.keys(attrs).length > 0) {
    node.attrs = attrs;
  }
  return [node];
}

/**
 * Convert a single BlockNote block to a TipTap node.
 */
function convertBlock(block: BNBlock): TipTapNode[] {
  const type = block.type;
  const props = block.props || {};

  // Map BlockNote block types to TipTap node types
  switch (type) {
    case 'paragraph': {
      const node: TipTapNode = { type: 'paragraph' };
      const attrs = extractBlockAttrs(props);
      if (Object.keys(attrs).length > 0) {
        node.attrs = attrs;
      }
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        node.content = block.content.flatMap(convertInlineContent);
      }
      const result: TipTapNode[] = [node];
      // BlockNote children are nested blocks (e.g. indented content)
      if (block.children && block.children.length > 0) {
        result.push(...block.children.flatMap(convertBlock));
      }
      return result;
    }

    case 'heading': {
      const level = props.level || 1;
      const node: TipTapNode = {
        type: 'heading',
        attrs: { level, ...extractBlockAttrs(props, ['level']) },
      };
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        node.content = block.content.flatMap(convertInlineContent);
      }
      const result: TipTapNode[] = [node];
      if (block.children && block.children.length > 0) {
        result.push(...block.children.flatMap(convertBlock));
      }
      return result;
    }

    case 'bulletListItem': {
      // BlockNote uses flat blocks with type 'bulletListItem'
      // TipTap uses bulletList > listItem > paragraph
      const paragraph: TipTapNode = { type: 'paragraph' };
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        paragraph.content = block.content.flatMap(convertInlineContent);
      }
      const listItem: TipTapNode = {
        type: 'listItem',
        content: [paragraph],
      };
      // Children of a list item become nested list items inside a sub-list
      if (block.children && block.children.length > 0) {
        const childItems = block.children.flatMap((child) =>
          convertBlock(child),
        );
        const subList: TipTapNode = {
          type: 'bulletList',
          content: childItems.filter((n) => n.type === 'listItem'),
        };
        if (subList.content && subList.content.length > 0) {
          listItem.content = [paragraph, subList];
        }
      }
      // Wrap in bulletList — caller will merge adjacent ones
      return [{ type: 'bulletList', content: [listItem] }];
    }

    case 'numberedListItem': {
      const paragraph: TipTapNode = { type: 'paragraph' };
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        paragraph.content = block.content.flatMap(convertInlineContent);
      }
      const listItem: TipTapNode = {
        type: 'listItem',
        content: [paragraph],
      };
      if (block.children && block.children.length > 0) {
        const childItems = block.children.flatMap((child) =>
          convertBlock(child),
        );
        const subList: TipTapNode = {
          type: 'orderedList',
          content: childItems.filter((n) => n.type === 'listItem'),
        };
        if (subList.content && subList.content.length > 0) {
          listItem.content = [paragraph, subList];
        }
      }
      return [{ type: 'orderedList', content: [listItem] }];
    }

    case 'blockquote': {
      // BlockNote stores blockquote content as inline content in a single block
      const paragraph: TipTapNode = { type: 'paragraph' };
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        paragraph.content = block.content.flatMap(convertInlineContent);
      }
      const result: TipTapNode[] = [
        { type: 'blockquote', content: [paragraph] },
      ];
      if (block.children && block.children.length > 0) {
        result.push(...block.children.flatMap(convertBlock));
      }
      return result;
    }

    case 'codeBlock': {
      const node: TipTapNode = { type: 'codeBlock' };
      if (props.language) {
        node.attrs = { language: props.language };
      }
      // Code blocks in BlockNote have text content
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        node.content = block.content
          .filter(
            (c): c is BNTextNode => c.type === 'text' && 'text' in c,
          )
          .map((c) => ({ type: 'text', text: c.text }));
      }
      return [node];
    }

    // Custom block nodes — map directly
    case 'defaultShortcut': {
      const node: TipTapNode = { type: 'defaultShortcut' };
      const attrs: Record<string, any> = {};
      if (props.only) attrs.only = props.only;
      if (Object.keys(attrs).length > 0) {
        node.attrs = attrs;
      }
      return [node];
    }

    // Fallback for any other block type (e.g. horizontal rule, images, etc.)
    default: {
      // Map known aliases
      if (type === 'horizontalRule' || type === 'rule') {
        return [{ type: 'horizontalRule' }];
      }

      // Generic passthrough — preserve type and convert content
      const node: TipTapNode = { type };
      const attrs = extractBlockAttrs(props);
      if (Object.keys(attrs).length > 0) {
        node.attrs = attrs;
      }
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content.length > 0
      ) {
        node.content = block.content.flatMap(convertInlineContent);
      }
      return [node];
    }
  }
}

/**
 * Extract meaningful attrs from BlockNote props, stripping defaults.
 */
function extractBlockAttrs(
  props: Record<string, any>,
  skipKeys: string[] = [],
): Record<string, any> {
  const attrs: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (skipKeys.includes(key)) continue;
    if (value === undefined || value === null) continue;
    if (DEFAULT_PROP_VALUES[key] === value) continue;
    if (key === 'textAlignment' && value !== 'left') {
      attrs.textAlign = value;
    } else if (
      key !== 'textColor' &&
      key !== 'backgroundColor' &&
      key !== 'textAlignment'
    ) {
      attrs[key] = value;
    }
  }
  return attrs;
}

/**
 * Merge adjacent list nodes of the same type.
 * BlockNote creates one bulletList/orderedList per list item,
 * but TipTap expects all items in a single list node.
 */
function mergeAdjacentLists(nodes: TipTapNode[]): TipTapNode[] {
  const result: TipTapNode[] = [];
  for (const node of nodes) {
    const prev = result[result.length - 1];
    if (
      prev &&
      prev.type === node.type &&
      (node.type === 'bulletList' || node.type === 'orderedList') &&
      Array.isArray(prev.content) &&
      Array.isArray(node.content)
    ) {
      prev.content = [...prev.content, ...node.content];
    } else {
      result.push(node);
    }
  }
  return result;
}

/**
 * Convert an entire BlockNote description (array of blocks) to TipTap JSON.
 */
export function convertBlockNoteToTipTap(blocks: BNBlock[]): Description {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { type: 'doc', content: [] };
  }

  const converted = blocks.flatMap(convertBlock);
  const merged = mergeAdjacentLists(converted);

  return {
    type: 'doc',
    content: merged,
  };
}

/**
 * Migrate a Description field if it is in BlockNote format.
 * Returns the migrated TipTap doc, or the original if already in TipTap format.
 */
export function migrateDescription(desc: unknown): Description {
  if (!desc) {
    return { type: 'doc', content: [] };
  }

  // Already TipTap format
  if (
    typeof desc === 'object' &&
    !Array.isArray(desc) &&
    (desc as any).type === 'doc'
  ) {
    return desc as Description;
  }

  // BlockNote format (array of blocks)
  if (Array.isArray(desc)) {
    try {
      return convertBlockNoteToTipTap(desc as BNBlock[]);
    } catch (err) {
      logger.error(
        `Failed to migrate BlockNote description: ${(err as Error).message}`,
        (err as Error).stack,
      );
      return { type: 'doc', content: [] };
    }
  }

  // Unknown format
  logger.warn(`Unknown description format, resetting to empty`);
  return { type: 'doc', content: [] };
}

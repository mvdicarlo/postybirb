import { BaseConverter } from './converters/base-converter';
import { BBCodeConverter } from './converters/bbcode-converter';
import {
  CustomConverter,
  CustomNodeHandler,
} from './converters/custom-converter';
import { HtmlConverter } from './converters/html-converter';
import { MarkdownConverter } from './converters/markdown-converter';
import { PlainTextConverter } from './converters/plaintext-converter';
import { ConversionContext } from './description-node.base';
import { TipTapNode } from './description-node.types';

export type InsertionOptions = {
  insertTitle?: string;
  insertTags?: string[];
  insertAd: boolean;
};

export class DescriptionNodeTree {
  private readonly nodes: TipTapNode[];

  private readonly insertionOptions: InsertionOptions;

  private context: ConversionContext;

  /** Empty paragraph used as spacing before the ad */
  private readonly spacing: TipTapNode = {
    type: 'paragraph',
    content: [],
  };

  /** PostyBirb ad in TipTap JSON format */
  private readonly ad: TipTapNode = {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Posted using PostyBirb',
        marks: [
          {
            type: 'link',
            attrs: { href: 'https://postybirb.com', target: '_blank' },
          },
        ],
      },
    ],
  };

  constructor(
    context: ConversionContext,
    nodes: TipTapNode[],
    insertionOptions: InsertionOptions,
  ) {
    this.context = context;
    this.insertionOptions = insertionOptions;
    this.nodes = nodes ?? [];
  }

  toBBCode(): string {
    const converter = new BBCodeConverter();
    return converter.convert(this.withInsertions(), this.context);
  }

  toPlainText(): string {
    const converter = new PlainTextConverter();
    return converter.convert(this.withInsertions(), this.context);
  }

  toHtml(): string {
    const converter = new HtmlConverter();
    return converter.convert(this.withInsertions(), this.context);
  }

  toMarkdown(): string {
    const converter = new MarkdownConverter();
    return converter.convert(this.withInsertions(), this.context);
  }

  parseCustom(blockHandler: CustomNodeHandler): string {
    const converter = new CustomConverter(blockHandler);
    return converter.convert(this.withInsertions(), this.context);
  }

  parseWithConverter(converter: BaseConverter): string {
    return converter.convert(this.withInsertions(), this.context);
  }

  public updateContext(updates: Partial<ConversionContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Finds all TipTap nodes of a specific type in the tree (recursively).
   */
  public findNodesByType(type: string): TipTapNode[] {
    const found: TipTapNode[] = [];

    const traverse = (nodes: TipTapNode[]) => {
      for (const node of nodes) {
        if (node.type === type) {
          found.push(node);
        }
        if (node.content) {
          traverse(node.content);
        }
      }
    };

    traverse(this.nodes);
    return found;
  }

  /**
   * Finds all custom shortcut IDs in the tree.
   */
  public findCustomShortcutIds(): Set<string> {
    const ids = new Set<string>();
    const shortcuts = this.findNodesByType('customShortcut');

    for (const shortcut of shortcuts) {
      const id = shortcut.attrs?.id;
      if (id) {
        ids.add(id);
      }
    }

    return ids;
  }

  /**
   * Finds all usernames in the tree.
   */
  public findUsernames(): Set<string> {
    const usernames = new Set<string>();
    const usernameNodes = this.findNodesByType('username');

    for (const node of usernameNodes) {
      const username = (node.attrs?.username as string)?.trim();
      if (username) {
        usernames.add(username);
      }
    }

    return usernames;
  }

  /**
   * Checks if a TipTap node is structurally empty
   * (no content, or content is only whitespace text nodes).
   * Only considers paragraph/heading nodes as trimmable.
   */
  private isEmptyNode(node: TipTapNode): boolean {
    if (node.type !== 'paragraph' && node.type !== 'heading') {
      return false;
    }

    if (!node.content || node.content.length === 0) {
      return true;
    }

    return node.content.every(
      (child) => child.type === 'text' && !child.text?.trim(),
    );
  }

  /**
   * Trims structurally empty nodes from the start and end of a block array,
   * preserving empty nodes in the middle (intentional blank lines).
   */
  private trimEmptyEdgeNodes(nodes: TipTapNode[]): TipTapNode[] {
    let start = 0;
    let end = nodes.length - 1;

    while (start < nodes.length && this.isEmptyNode(nodes[start])) {
      start++;
    }

    while (end >= start && this.isEmptyNode(nodes[end])) {
      end--;
    }

    if (start > end) return [];

    return nodes.slice(start, end + 1);
  }

  /**
   * Expands custom shortcut nodes that appear as the sole content of a
   * paragraph into their resolved block-level content. This is necessary
   * because `customShortcut` is a TipTap inline atom but its content is
   * block-level. Without expansion, the converter embeds block HTML inside
   * a parent block (e.g. `<div><div>…</div></div>`), which becomes nested
   * `<p>` tags after post-processing and is rejected as invalid HTML by
   * sites like Newgrounds.
   *
   * Only expands shortcuts that are both resolved in the context AND should
   * be rendered for the current website (respects the `only` restriction).
   *
   * Note: when a shortcut sits next to other meaningful text in the same
   * paragraph, the converter renders it inline and any block-level
   * formatting on the shortcut's blocks (headings, alignment, lists, etc.)
   * is intentionally lost. This keeps the surrounding text on a single
   * line and avoids forcing a structural split that users find unexpected.
   */
  private expandBlockShortcuts(nodes: TipTapNode[]): TipTapNode[] {
    const result: TipTapNode[] = [];

    for (const node of nodes) {
      const effectiveContent = (node.content ?? []).filter(
        (child) => !(child.type === 'text' && !child.text?.trim()),
      );

      if (
        node.type === 'paragraph' &&
        effectiveContent.length === 1 &&
        effectiveContent[0].type === 'customShortcut'
      ) {
        const shortcutNode = effectiveContent[0];
        const id = shortcutNode.attrs?.id as string | undefined;

        // Respect the `only` visibility restriction
        const onlyRaw: string = shortcutNode.attrs?.only ?? '';
        const onlyTo = onlyRaw
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter((s: string) => s.length > 0);
        const visible =
          onlyTo.length === 0 ||
          onlyTo.includes(this.context.website.toLowerCase());

        if (id && visible) {
          const shortcutBlocks = this.context.customShortcuts.get(id);
          if (shortcutBlocks?.length) {
            result.push(...shortcutBlocks);
            continue;
          }
        }
      }

      result.push(node);
    }

    return result;
  }

  private withInsertions(): TipTapNode[] {
    // Trim empty edge nodes before insertions so converters receive clean input
    const trimmed = this.trimEmptyEdgeNodes([...this.nodes]);
    // Promote block-shortcut-only paragraphs into real block siblings so
    // converters never produce nested block elements (e.g. <p><p>…</p></p>).
    const nodes = this.expandBlockShortcuts(trimmed);
    const { insertAd, insertTags, insertTitle } = this.insertionOptions;

    if (insertTitle) {
      nodes.unshift({
        type: 'heading',
        attrs: { level: 2 },
        content: [
          {
            type: 'text',
            text: insertTitle,
          },
        ],
      });
    }

    if (insertTags) {
      nodes.push({
        type: 'paragraph',
        content: [],
      });
      nodes.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: insertTags.map((e) => `#${e}`).join(' '),
          },
        ],
      });
    }

    if (insertAd) {
      const lastNode = nodes[nodes.length - 1];
      const isLastNodeSpacing =
        lastNode?.type === 'paragraph' &&
        (!lastNode.content || lastNode.content.length === 0);

      // Avoid duplicated spacings
      if (!isLastNodeSpacing) {
        nodes.push(this.spacing);
      }

      nodes.push(this.ad);
    }

    return nodes;
  }
}

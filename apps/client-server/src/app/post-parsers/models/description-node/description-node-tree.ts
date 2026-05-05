/* eslint-disable @typescript-eslint/no-explicit-any */
import TurndownService from 'turndown';
import { BaseConverter } from './converters/base-converter';
import { BBCodeConverter } from './converters/bbcode-converter';
import {
  CustomConverter,
  CustomNodeHandler,
} from './converters/custom-converter';
import { HtmlConverter } from './converters/html-converter';
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
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  toPlainText(): string {
    const converter = new PlainTextConverter();
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  toHtml(): string {
    const converter = new HtmlConverter();
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  toMarkdown(turndownService?: TurndownService): string {
    const converter = turndownService ?? new TurndownService();

    converter.addRule('nestedIndent', {
      filter: (node) =>
        node.nodeName === 'DIV' &&
        node.getAttribute('style')?.includes('margin-left'),
      replacement: (content) =>
        `\n\n> ${content.trim().replace(/\n/g, '\n> ')}\n\n`,
    });

    const html = this.toHtml();
    return converter.turndown(html);
  }

  parseCustom(blockHandler: CustomNodeHandler): string {
    const converter = new CustomConverter(blockHandler);
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  parseWithConverter(converter: BaseConverter): string {
    return converter.convertBlocks(this.withInsertions(), this.context);
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
      (child) =>
        child.type === 'text' &&
        (!(child as any).text || (child as any).text.trim() === ''),
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

  private withInsertions(): TipTapNode[] {
    // Trim empty edge nodes before insertions so converters receive clean input
    const nodes = this.trimEmptyEdgeNodes([...this.nodes]);
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

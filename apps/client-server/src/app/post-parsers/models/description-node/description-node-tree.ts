/* eslint-disable @typescript-eslint/no-unused-vars */
import TurndownService from 'turndown';
import { DescriptionBlockNode } from './block-description-node';
import { BaseConverter } from './converters/base-converter';
import { BBCodeConverter } from './converters/bbcode-converter';
import {
  CustomConverter,
  CustomNodeHandler,
} from './converters/custom-converter';
import { HtmlConverter } from './converters/html-converter';
import { PlainTextConverter } from './converters/plaintext-converter';
import { ConversionContext } from './description-node.base';
import { BlockTypes, IDescriptionBlockNode } from './description-node.types';
import { DescriptionInlineNode } from './inline-description-node';
import { DescriptionTextNode } from './text-description-node';

export type InsertionOptions = {
  insertTitle?: string;
  insertTags?: string[];
  insertAd: boolean;
};

export class DescriptionNodeTree {
  private readonly nodes: Array<DescriptionBlockNode>;

  private readonly insertionOptions: InsertionOptions;

  private context: ConversionContext;

  private readonly spacing: IDescriptionBlockNode = {
    id: 'ad-spacing',
    type: 'paragraph',
    props: {
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [],
    children: [],
  };

  private readonly ad: IDescriptionBlockNode = {
    id: 'ad',
    type: 'paragraph',
    props: {
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [
      {
        type: 'link',
        href: 'https://postybirb.com',
        content: [
          {
            type: 'text',
            text: 'Posted using PostyBirb',
            styles: {},
            props: {},
          },
        ],
        props: {},
      },
    ],
    children: [],
  };

  constructor(
    context: ConversionContext,
    nodes: Array<IDescriptionBlockNode>,
    insertionOptions: InsertionOptions,
  ) {
    this.context = context;
    this.insertionOptions = insertionOptions;
    this.nodes =
      nodes.map((node) => {
        if (BlockTypes.includes(node.type)) {
          return new DescriptionBlockNode(node);
        }
        throw new Error('Root nodes must be block nodes');
      }) ?? [];
  }

  toBBCode(): string {
    const converter = new BBCodeConverter();
    return converter.convertBlocks(this.withInsertions(), this.context).trim();
  }

  toPlainText(): string {
    const converter = new PlainTextConverter();
    return converter.convertBlocks(this.withInsertions(), this.context).trim();
  }

  toHtml(): string {
    const converter = new HtmlConverter();
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  toMarkdown(turndownService?: TurndownService): string {
    const converter = turndownService ?? new TurndownService();

    // Add custom rule to convert margin-left divs to blockquotes
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

  /**
   * Allows for custom conversion using a provided handler.
   */
  parseCustom(blockHandler: CustomNodeHandler): string {
    const converter = new CustomConverter(blockHandler);
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  /**
   * Allows for custom conversion using a provided converter.
   */
  parseWithConverter(converter: BaseConverter): string {
    return converter.convertBlocks(this.withInsertions(), this.context);
  }

  /**
   * Updates the context with resolved shortcuts and usernames.
   */
  public updateContext(updates: Partial<ConversionContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Finds all inline nodes of a specific type in the tree, including nested children.
   */
  public findInlineNodesByType(type: string): Array<DescriptionInlineNode> {
    const found: Array<DescriptionInlineNode> = [];

    const traverseContent = (
      content: Array<DescriptionInlineNode | DescriptionTextNode>,
    ) => {
      for (const node of content) {
        if (node instanceof DescriptionInlineNode && node.type === type) {
          found.push(node);
        }
        // Only DescriptionInlineNode has content, DescriptionTextNode has text
        if (node instanceof DescriptionInlineNode) {
          traverseContent(node.content);
        }
      }
    };

    const traverseBlocks = (blocks: Array<DescriptionBlockNode>) => {
      for (const block of blocks) {
        traverseContent(block.content);
        // Recursively traverse children
        if (block.children && block.children.length > 0) {
          traverseBlocks(block.children);
        }
      }
    };

    traverseBlocks(this.nodes);

    return found;
  }

  /**
   * Finds all custom shortcut IDs in the tree.
   */
  public findCustomShortcutIds(): Set<string> {
    const ids = new Set<string>();
    const shortcuts = this.findInlineNodesByType('customShortcut');

    for (const shortcut of shortcuts) {
      if (shortcut.props.id) {
        ids.add(shortcut.props.id);
      }
    }

    return ids;
  }

  /**
   * Finds all usernames in the tree.
   */
  public findUsernames(): Set<string> {
    const usernames = new Set<string>();
    const usernameNodes = this.findInlineNodesByType('username');

    for (const node of usernameNodes) {
      // Get username from props (new format) or content (old format for backwards compatibility)
      const username = node.props.username
        ? (node.props.username as string).trim()
        : node.content
            .filter((c) => c instanceof DescriptionTextNode)
            .map((c) => c.text)
            .join('')
            .trim();

      if (username) {
        usernames.add(username);
      }
    }

    return usernames;
  }

  private withInsertions(): Array<DescriptionBlockNode> {
    const nodes = [...this.nodes];
    const { insertAd, insertTags, insertTitle } = this.insertionOptions;
    if (insertTitle) {
      nodes.unshift(
        new DescriptionBlockNode({
          id: 'title',
          type: 'heading',
          props: { level: '2' },
          content: [
            {
              type: 'text',
              text: insertTitle,
              styles: {},
              props: {},
            },
          ],
        }),
      );
    }

    if (insertTags) {
      nodes.push(
        new DescriptionBlockNode({
          id: 'tags',
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'text',
              text: insertTags.map((e) => `#${e}`).join(' '),
              styles: {},
              props: {},
            },
          ],
        }),
      );
    }

    if (insertAd) {
      const lastNode = nodes[nodes.length - 1];
      const isLastNodeSpacing =
        lastNode &&
        lastNode.type === 'paragraph' &&
        lastNode.content.length === 0 &&
        lastNode.children.length === 0;

      if (!isLastNodeSpacing) {
        nodes.push(new DescriptionBlockNode(this.spacing));
      }

      nodes.push(new DescriptionBlockNode(this.ad));
    }
    return nodes;
  }
}

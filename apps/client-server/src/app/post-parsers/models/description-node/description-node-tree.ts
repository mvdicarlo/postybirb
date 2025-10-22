/* eslint-disable @typescript-eslint/no-unused-vars */
import { Description } from '@postybirb/types';
import TurndownService from 'turndown';
import { DescriptionBlockNode } from './block-description-node';
import { BBCodeConverter } from './converters/bbcode-converter';
import {
  CustomConverter,
  CustomNodeHandler,
} from './converters/custom-converter';
import { HtmlConverter } from './converters/html-converter';
import { PlainTextConverter } from './converters/plaintext-converter';
import { ConversionContext } from './description-node.base';
import { BlockTypes, IDescriptionBlockNode } from './description-node.types';

export type InsertionOptions = {
  insertTitle?: string;
  insertTags?: string[];
  insertAd: boolean;
};

export class DescriptionNodeTree {
  private readonly nodes: Array<DescriptionBlockNode>;

  private readonly insertionOptions: InsertionOptions;

  private readonly context: ConversionContext;

  private readonly ad: Description = [
    {
      id: 'ad-spacing',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [],
      children: [],
    },
    {
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
            { type: 'text', text: 'Posted using PostyBirb', styles: {} },
          ],
        },
      ],
      children: [],
    },
  ];

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
              text: insertTags.join(' '),
              styles: {},
              props: {},
            },
          ],
        }),
      );
    }

    if (insertAd) {
      nodes.push(
        ...this.ad.map(
          (node) =>
            new DescriptionBlockNode(node as unknown as IDescriptionBlockNode),
        ),
      );
    }
    return nodes;
  }
}

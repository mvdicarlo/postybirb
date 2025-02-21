/* eslint-disable @typescript-eslint/no-unused-vars */
import { Description, UsernameShortcut } from '@postybirb/types';
import TurndownService from 'turndown';
import { DescriptionBlockNode } from './block-description-node';
import { DescriptionNode } from './description-node.base';
import {
  BlockTypes,
  IDescriptionBlockNode,
  ShortcutEnabledFields,
} from './description-node.types';

export type InsertionOptions = {
  insertTitle?: string;
  insertTags?: string[];
  insertAd: boolean;
};

export type CustomDescriptionParser = (node: DescriptionNode) => string;

export class DescriptionNodeTree {
  private readonly website: string;

  private readonly nodes: Array<DescriptionBlockNode>;

  private readonly insertionOptions: InsertionOptions;

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
    website: string,
    nodes: Array<IDescriptionBlockNode>,
    insertionOptions: InsertionOptions,
    shortcuts: Record<string, UsernameShortcut>,
    fieldShortcuts: ShortcutEnabledFields,
  ) {
    this.website = website;
    this.insertionOptions = insertionOptions;
    this.nodes =
      nodes.map((node) => {
        if (BlockTypes.includes(node.type)) {
          return new DescriptionBlockNode(website, node, shortcuts ?? {});
        }
        throw new Error('Root nodes must be block nodes');
      }) ?? [];
  }

  /**
   * Converts the description tree to plain text.
   *
   * @return {*}  {string}
   */
  toPlainText(): string {
    return this.withInsertions()
      .map((node) => node.toString())
      .join('\r\n')
      .trim();
  }

  /**
   * Converts the description tree to HTML.
   *
   * @return {*}  {string}
   */
  public toHtml(): string {
    return this.withInsertions()
      .map((node) => node.toHtmlString())
      .join('');
  }

  /**
   * Converts the description tree to markdown.
   *
   * @param {TurndownService} [turndownService] - Optional custom turndown service instance.
   * @return {*}  {string}
   */
  public toMarkdown(turndownService?: TurndownService): string {
    const converter = turndownService ?? new TurndownService();
    const html = this.toHtml();
    return converter.turndown(html);
  }

  /**
   * Allows for custom parsing of the description tree.
   *
   * @param {(node: DescriptionNode) => void} cb
   * @return {*}  {string}
   */
  public parseCustom(cb: (node: DescriptionNode) => void): string {
    return this.withInsertions().map(cb).join('\n');
  }

  private withInsertions(): Array<DescriptionBlockNode> {
    const nodes = [...this.nodes];
    const { insertAd, insertTags, insertTitle } = this.insertionOptions;
    if (insertTitle) {
      nodes.unshift(
        new DescriptionBlockNode(
          this.website,
          {
            id: 'title',
            type: 'heading',
            props: { level: '3' },
            content: [
              {
                type: 'text',
                text: insertTitle,
                styles: {},
                props: {},
              },
            ],
          },
          {},
        ),
      );
    }

    if (insertTags) {
      nodes.push(
        new DescriptionBlockNode(
          this.website,
          {
            id: 'tags',
            type: 'paragraph',
            props: {},
            content: [
              {
                type: 'text',
                text: insertTags.join(', '),
                styles: {},
                props: {},
              },
            ],
          },
          {},
        ),
      );
    }

    if (insertAd) {
      nodes.push(
        ...this.ad.map(
          (node) =>
            new DescriptionBlockNode(
              this.website,
              node as unknown as IDescriptionBlockNode,
              {},
            ),
        ),
      );
    }
    return nodes;
  }
}

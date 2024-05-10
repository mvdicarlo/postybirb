/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { UsernameShortcut } from '@postybirb/types';
import { TurndownService } from 'turndown';
import { DescriptionSchema } from './schemas/description-schema';

const BlockTypes = Object.keys(DescriptionSchema.blockSchema);
const InlineTypes = Object.keys(DescriptionSchema.inlineContentSchema);

interface IDescriptionNode<Type = string> {
  type: Type;
  props: Record<string, string>;
}

type BlockType = keyof typeof DescriptionSchema.blockSchema;
interface IDescriptionBlockNode extends IDescriptionNode<BlockType> {
  id: string;
  content: Array<IDescriptionInlineNode | IDescriptionTextNode>;
}

type InlineType = keyof typeof DescriptionSchema.inlineContentSchema;
interface IDescriptionInlineNode extends IDescriptionNode<InlineType> {
  content: Array<IDescriptionTextNode>;
}

type Styles = Partial<{
  [key in keyof typeof DescriptionSchema.styleSchema]: string | boolean;
}>;

interface IDescriptionTextNode extends IDescriptionNode<'text'> {
  text: string;
  styles: Styles;
}

abstract class DescriptionNode<Type = string>
  implements IDescriptionNode<Type>
{
  type: Type;

  props: Record<string, string>;

  shortcuts: Record<string, UsernameShortcut>;

  constructor(
    node: IDescriptionNode<Type>,
    shortcuts: Record<string, UsernameShortcut>
  ) {
    this.type = node.type;
    this.props = node.props ?? {};
    this.shortcuts = shortcuts;
  }

  abstract toHtmlString(): string;

  abstract toString(): string;
}

class DescriptionBlockNode
  extends DescriptionNode<IDescriptionBlockNode['type']>
  implements IDescriptionBlockNode
{
  id: string;

  content: Array<DescriptionInlineNode | DescriptionTextNode>;

  constructor(
    node: IDescriptionBlockNode,
    shortcuts: Record<string, UsernameShortcut>
  ) {
    super(node, shortcuts);
    this.id = node.id;
    this.content = [];
    node.content?.forEach((child) => {
      if (BlockTypes.includes(child.type)) {
        throw new Error('Block nodes cannot contain other block nodes');
      } else if (InlineTypes.includes(child.type)) {
        this.content.push(
          new DescriptionInlineNode(child as IDescriptionInlineNode, shortcuts)
        );
      } else if (child.type === 'text') {
        this.content.push(
          new DescriptionTextNode(child as IDescriptionTextNode, shortcuts)
        );
      } else {
        throw new Error(`Unknown node type: ${child.type}`);
      }
    });
  }

  toString(): string {
    return this.content.map((child) => child.toString()).join('');
  }

  toHtmlString(): string {
    if (!this.content.length) return '';

    let block = null;
    if (this.type === 'paragraph') block = 'div';
    if (this.type === 'heading') block = `h${this.props.level}`;
    if (this.type === 'hr') return '<hr>';
    if (block === null) throw new Error(`Unsupported block type: ${this.type}`);

    const styles: string[] = [];
    if (this.props.textColor) {
      styles.push(`color: ${this.props.textColor}`);
    }
    if (this.props.backgroundColor) {
      styles.push(`background-color: ${this.props.backgroundColor}`);
    }
    if (this.props.textAlignment) {
      styles.push(`text-align: ${this.props.textAlign}`);
    }

    return `<${block} style="${styles.join(';')}">${this.content
      .map((child) => child.toHtmlString())
      .join('')}</${block}>`;
  }
}

class DescriptionInlineNode
  extends DescriptionNode<IDescriptionInlineNode['type']>
  implements IDescriptionInlineNode
{
  content: DescriptionTextNode[];

  constructor(
    node: IDescriptionInlineNode,
    shortcuts: Record<string, UsernameShortcut>
  ) {
    super(node, shortcuts);
    this.content = [];
    node.content.forEach((child) => {
      if (child.type === 'text') {
        this.content.push(
          new DescriptionTextNode(child as IDescriptionTextNode, shortcuts)
        );
      } else {
        throw new Error('Inline nodes can only contain text nodes');
      }
    });
  }

  private getUsernameShortcutLink(id: string) {
    const username = this.content
      .map((child) => child.text)
      .join('')
      .trim();
    const url = this.shortcuts[id]?.url;
    return username && url
      ? { url: url.replace('$1', username), username }
      : undefined;
  }

  toString(): string {
    return this.content.map((child) => child.toString()).join('');
  }

  toHtmlString(): string {
    if (!this.content.length) return '';

    if (this.type === 'link') {
      return `<a target="_blank" href="${this.props.href}">${this.content
        .map((child) => child.toHtmlString())
        .join('')}</a>`;
    }

    if (this.type === 'username') {
      if (!this.content.length) return '';
      const sc = this.getUsernameShortcutLink(this.props.shortcut);
      if (!sc) return '';
      return `<a target="_blank" href="${sc.url}">${sc.username}</a>`;
    }

    return `<span>${this.content
      .map((child) => child.toHtmlString())
      .join('')}</span>`;
  }
}

class DescriptionTextNode
  extends DescriptionNode<IDescriptionTextNode['type']>
  implements IDescriptionTextNode
{
  text: string;

  styles: Styles;

  constructor(
    node: IDescriptionTextNode,
    shortcuts: Record<string, UsernameShortcut>
  ) {
    super(node, shortcuts);
    this.text = node.text ?? '';
    this.styles = node.styles ?? {};
  }

  toString(): string {
    return this.text;
  }

  toHtmlString(): string {
    const segments: string[] = [];
    const styles: string[] = [];

    if (this.styles.bold) {
      segments.push('b');
    }

    if (this.styles.italic) {
      segments.push('i');
    }

    if (this.styles.underline) {
      segments.push('u');
    }

    if (this.styles.strike) {
      segments.push('s');
    }

    if (this.styles.textColor) {
      styles.push(`color: ${this.styles.textColor}`);
    }

    if (this.styles.backgroundColor) {
      styles.push(`background-color: ${this.styles.backgroundColor}`);
    }

    return `<span style="${styles.join(';')}">${segments
      .map((s) => `</${s}>`)
      .join('')}${this.text}${segments
      .reverse()
      .map((s) => `</${s}>`)
      .join('')}</span>`;
  }
}

export class DescriptionNodeTree {
  private readonly nodes: Array<DescriptionBlockNode>;

  constructor(
    nodes: Array<IDescriptionBlockNode>,
    shortcuts: Record<string, UsernameShortcut>
  ) {
    this.nodes = [];
    nodes.forEach((node) => {
      if (BlockTypes.includes(node.type)) {
        this.nodes.push(new DescriptionBlockNode(node, shortcuts ?? {}));
      } else {
        throw new Error('Root nodes must be block nodes');
      }
    });
  }

  /**
   * Converts the description tree to plain text.
   *
   * @return {*}  {string}
   */
  toPlainText(): string {
    return this.nodes
      .map((node) => node.toString())
      .join('\r\n')
      .trim();
  }

  /**
   * Converts the description tree to HTML.
   *
   * @param {boolean} [wrap] - Whether to wrap the HTML in a div element parent.
   * @return {*}  {string}
   */
  public toHtml(wrap?: boolean): string {
    const htmlString = this.nodes.map((node) => node.toHtmlString()).join('');
    return wrap ? `<div>${htmlString}</div>` : htmlString;
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
}

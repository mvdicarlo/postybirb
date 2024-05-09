/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { DescriptionSchema } from './schemas/description-schema';

const BlockTypes = Object.keys(DescriptionSchema.blockSchema);
const InlineTypes = Object.keys(DescriptionSchema.inlineContentSchema);

interface IDescriptionNode {
  type: string;
  props: Record<string, string>;
}

interface IDescriptionBlockNode extends IDescriptionNode {
  id: string;
  content: Array<IDescriptionInlineNode | IDescriptionTextNode>;
}

interface IDescriptionInlineNode extends IDescriptionNode {
  content: Array<IDescriptionTextNode>;
}

type Styles = Record<
  Extract<[keyof typeof DescriptionSchema.styleSchema], string>,
  string | boolean
>;

interface IDescriptionTextNode extends IDescriptionNode {
  text: string;
  styles: Styles;
}

abstract class DescriptionNode implements IDescriptionNode {
  type: string;

  props: Record<string, string>;

  constructor(node: IDescriptionNode) {
    this.type = node.type;
    this.props = node.props ?? {};
  }

  abstract toHtmlString(): string;
}

class DescriptionBlockNode
  extends DescriptionNode
  implements IDescriptionBlockNode
{
  id: string;

  content: Array<IDescriptionInlineNode | IDescriptionTextNode>;

  constructor(node: IDescriptionBlockNode) {
    super(node);
    this.id = node.id;
    this.content = [];
    node.content?.forEach((child) => {
      if (BlockTypes.includes(child.type)) {
        throw new Error('Block nodes cannot contain other block nodes');
      } else if (InlineTypes.includes(child.type)) {
        this.content.push(
          new DescriptionInlineNode(child as IDescriptionInlineNode)
        );
      } else if (child.type === 'text') {
        this.content.push(
          new DescriptionTextNode(child as IDescriptionTextNode)
        );
      } else {
        throw new Error(`Unknown node type: ${child.type}`);
      }
    });
  }

  toHtmlString(): string {
    if (!this.content.length) return '';

    return `<div>${this.content
      .map((child) => child.toString())
      .join('')}</div>`;
  }
}

class DescriptionInlineNode
  extends DescriptionNode
  implements IDescriptionInlineNode
{
  content: IDescriptionTextNode[];

  constructor(node: IDescriptionInlineNode) {
    super(node);
    this.content = [];
    node.content.forEach((child) => {
      if (child.type === 'text') {
        this.content.push(
          new DescriptionTextNode(child as IDescriptionTextNode)
        );
      } else {
        throw new Error('Inline nodes can only contain text nodes');
      }
    });
  }

  toHtmlString(): string {
    if (!this.content.length) return '';

    if (this.type === 'link') {
      return `<a target="_blank" href="${this.props.href}">${this.content
        .map((child) => child.toString())
        .join('')}</a>`;
    }

    if (this.type === 'username') {
      return `<a target="_blank" href="${this.props.href}">${this.content
        .map((child) => child.toString())
        .join('')}</a>`;
    }

    return `<span>${this.content
      .map((child) => child.toString())
      .join('')}</span>`;
  }
}

class DescriptionTextNode
  extends DescriptionNode
  implements IDescriptionTextNode
{
  text: string;

  styles: Styles;

  constructor(node: IDescriptionTextNode) {
    super(node);
    this.text = node.text ?? '';
    this.styles = node.styles ?? {};
  }

  toHtmlString(): string {
    const inlineString = [];
    // TODO - add support for styles
    return `${this.text}`;
  }
}

export class DescriptionNodeTree {
  private readonly nodes: Array<DescriptionBlockNode>;

  constructor(nodes: Array<IDescriptionBlockNode>) {
    this.nodes = [];
    nodes.forEach((node) => {
      if (BlockTypes.includes(node.type)) {
        this.nodes.push(new DescriptionBlockNode(node));
      } else {
        throw new Error('Root nodes must be block nodes');
      }
    });
  }

  public toHtml(wrap?: boolean): string {
    const htmlString = this.nodes.map((node) => node.toHtmlString()).join('');
    return wrap ? `<div>${htmlString}</div>` : htmlString;
  }

  public toMarkdown(): string {
    const html = this.toHtml();
    // TODO - convert HTML to markdown with Turndown
    return '';
  }
}

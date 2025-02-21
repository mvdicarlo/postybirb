import { UsernameShortcut } from '@postybirb/types';
import { DescriptionNode } from './description-node.base';
import {
  BlockTypes,
  IDescriptionBlockNode,
  IDescriptionInlineNode,
  IDescriptionTextNode,
  InlineTypes,
} from './description-node.types';
import { DescriptionInlineNode } from './inline-description-node';
import { DescriptionTextNode } from './text-description-node';

export class DescriptionBlockNode
  extends DescriptionNode<IDescriptionBlockNode['type']>
  implements IDescriptionBlockNode
{
  id: string;

  content: Array<DescriptionInlineNode | DescriptionTextNode>;

  constructor(
    website: string,
    node: IDescriptionBlockNode,
    shortcuts: Record<string, UsernameShortcut>,
  ) {
    super(website, node, shortcuts);
    this.id = node.id;
    this.content =
      node.content?.map((child) => {
        if (BlockTypes.includes(child.type)) {
          throw new Error('Block nodes cannot contain other block nodes');
        } else if (child.type === 'text') {
          return new DescriptionTextNode(
            website,
            child as IDescriptionTextNode,
            shortcuts,
          );
        } else if (InlineTypes.includes(child.type)) {
          return new DescriptionInlineNode(
            website,
            child as IDescriptionInlineNode,
            shortcuts,
          );
        }
        throw new Error(`Unknown node type: ${child.type}`);
      }) ?? [];
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
    if (this.props.textColor && this.props.textColor !== 'default') {
      styles.push(`color: ${this.props.textColor}`);
    }
    if (
      this.props.backgroundColor &&
      this.props.backgroundColor !== 'default'
    ) {
      styles.push(`background-color: ${this.props.backgroundColor}`);
    }
    if (
      this.props.textAlignment &&
      this.props.textAlignment !== 'default' &&
      this.props.textAlignment !== 'left'
    ) {
      styles.push(`text-align: ${this.props.textAlignment}`);
    }

    const stylesString = styles.join(';');
    return `<${block}${
      stylesString.length ? ` styles="${stylesString}"` : ''
    }>${this.content.map((child) => child.toHtmlString()).join('')}</${block}>`;
  }
}

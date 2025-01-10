import { UsernameShortcut } from '@postybirb/types';
import { DescriptionNode } from './description-node.base';
import {
  IDescriptionInlineNode,
  IDescriptionTextNode,
} from './description-node.types';
import { DescriptionTextNode } from './text-description-node';

export class DescriptionInlineNode
  extends DescriptionNode<IDescriptionInlineNode['type']>
  implements IDescriptionInlineNode
{
  content: DescriptionTextNode[];

  href?: string;

  constructor(
    node: IDescriptionInlineNode,
    shortcuts: Record<string, UsernameShortcut>,
  ) {
    super(node, shortcuts);
    this.href = node.href;
    this.content =
      node?.content?.map((child) => {
        if (child.type === 'text') {
          return new DescriptionTextNode(
            child as IDescriptionTextNode,
            shortcuts,
          );
        }
        throw new Error('Inline nodes can only contain text nodes');
      }) ?? [];
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
    if (this.type === 'link') {
      return `${this.content.map((child) => child.toString()).join('')}: ${
        this.href ?? this.props.href
      }`;
    }
    return this.content.map((child) => child.toString()).join('');
  }

  toHtmlString(): string {
    // TODO - figure out if we need img/video/audio tags support here
    if (!this.content.length) return '';

    if (this.type === 'link') {
      return `<a target="_blank" href="${
        this.href ?? this.props.href
      }">${this.content.map((child) => child.toHtmlString()).join('')}</a>`;
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

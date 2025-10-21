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
    website: string,
    node: IDescriptionInlineNode,
    shortcuts: Record<string, UsernameShortcut>,
  ) {
    super(website, node, shortcuts);
    this.href = node.href;
    this.content =
      node?.content?.map((child) => {
        if (child.type === 'text') {
          return new DescriptionTextNode(
            website,
            child as IDescriptionTextNode,
            shortcuts,
          );
        }
        throw new Error('Inline nodes can only contain text nodes');
      }) ?? [];
  }

  private getUsernameShortcutLink(id: string):
    | undefined
    | {
        url: string;
        username: string;
      } {
    const username = this.content
      .map((child) => child.text)
      .join('')
      .trim();
    const shortcut = this.shortcuts[id];
    const url =
      shortcut?.convert?.call(this, this.website, this.props.shortcut) ??
      shortcut?.url;
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

    if (this.type === 'username') {
      const onlyTo = (this.props.only?.split(',') ?? [])
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);
      if (onlyTo.length > 0 && !onlyTo.includes(this.website.toLowerCase())) {
        return '';
      }
      const sc = this.getUsernameShortcutLink(this.props.shortcut);
      return sc ? sc.url : '';
    }

    if (this.type === 'customShortcut') {
      return DescriptionInlineNode.getCustomShortcutMarker(this.props.id);
    }

    return this.content.map((child) => child.toString()).join('');
  }

  toHtmlString(): string {
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
      if (!sc.url.startsWith('http')) return `<span>${sc.url}</span>`;
      return `<a target="_blank" href="${sc.url}">${sc.username}</a>`;
    }

    if (this.type === 'customShortcut') {
      return DescriptionInlineNode.getCustomShortcutMarker(this.props.id);
    }

    return `<span>${this.content
      .map((child) => child.toHtmlString())
      .join('')}</span>`;
  }

  toBBCodeString(): string {
    if (!this.content.length) return '';
    if (this.type === 'link') {
      return `[url=${this.href ?? this.props.href}]${this.content
        .map((child) => child.toBBCodeString())
        .join('')}[/url]`;
    }

    if (this.type === 'username') {
      const sc = this.getUsernameShortcutLink(this.props.shortcut);
      if (sc?.url.startsWith('http')) {
        return `[url=${sc.url}]${sc.username}[/url]`;
      }
      return sc ? `${sc.url ?? sc.username}` : '';
    }

    if (this.type === 'customShortcut') {
      return DescriptionInlineNode.getCustomShortcutMarker(this.props.id);
    }

    return this.content.map((child) => child.toBBCodeString()).join('');
  }

  public static getCustomShortcutMarker(id: string) {
    return `<%PB_CUSTOM_SHORTCUT:${id}%>`;
  }

  public static getCustomShortcutMarkerRegex() {
    return /<%PB_CUSTOM_SHORTCUT:([a-zA-Z0-9_-]+)%>/g;
  }
}

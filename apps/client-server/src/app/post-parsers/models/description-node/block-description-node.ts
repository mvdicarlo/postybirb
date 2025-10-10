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

export const DEFAULT_MARKER = '<%PB_DEFAULT%>';

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

  private isMediaBlock(): boolean {
    return (
      this.type === 'image' || this.type === 'video' || this.type === 'audio'
    );
  }

  private imageToHtml(): string {
    const src = this.props.url || '';
    const alt = this.props.name || this.props.caption || '';
    const caption = this.props.caption || '';
    const width = this.props.previewWidth || '';
    const align =
      this.props.textAlignment &&
      this.props.textAlignment !== 'default' &&
      this.props.textAlignment !== 'left'
        ? this.props.textAlignment
        : '';

    let imgTag = `<img src="${src}" alt="${alt}"`;
    if (width) imgTag += ` width="${width}"`;
    if (align) imgTag += ` style="text-align: ${align}"`;
    imgTag += '>';

    if (caption) {
      return `<figure>${imgTag}<figcaption>${caption}</figcaption></figure>`;
    }
    return imgTag;
  }

  private videoToHtml(): string {
    const src = this.props.url || '';
    const caption = this.props.caption || '';
    const width = this.props.previewWidth || '';
    const align =
      this.props.textAlignment &&
      this.props.textAlignment !== 'default' &&
      this.props.textAlignment !== 'left'
        ? this.props.textAlignment
        : '';

    let videoTag = `<video controls`;
    if (width) videoTag += ` width="${width}"`;
    if (align) videoTag += ` style="text-align: ${align}"`;
    videoTag += `><source src="${src}">Your browser does not support the video tag.</video>`;

    if (caption) {
      return `<figure>${videoTag}<figcaption>${caption}</figcaption></figure>`;
    }
    return videoTag;
  }

  private audioToHtml(): string {
    const src = this.props.url || '';
    const caption = this.props.caption || '';

    const audioTag = `<audio controls><source src="${src}">Your browser does not support the audio tag.</audio>`;

    if (caption) {
      return `<figure>${audioTag}<figcaption>${caption}</figcaption></figure>`;
    }
    return audioTag;
  }

  toString(): string {
    if (this.type === 'default') return DEFAULT_MARKER;
    if (this.type === 'hr') return '----------';
    // Filter out media blocks (image, video, audio)
    if (this.isMediaBlock()) {
      return '';
    }
    return this.content.map((child) => child.toString()).join('');
  }

  toHtmlString(): string {
    let block = null;
    if (this.type === 'paragraph') block = 'div';
    if (this.type === 'heading') block = `h${this.props.level}`;
    if (this.type === 'hr') return '<hr>';
    if (this.type === 'default') return DEFAULT_MARKER;

    // Handle media blocks
    if (this.type === 'image') return `<div>${this.imageToHtml()}</div>`;
    if (this.type === 'video') return `<div>${this.videoToHtml()}</div>`;
    if (this.type === 'audio') return `<div>${this.audioToHtml()}</div>`;

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

  toBBCodeString(): string {
    let block = null;
    let text = null;

    // No block type for a base paragraph
    if (this.type === 'paragraph') {
      text = this.content.map((child) => child.toBBCodeString()).join('');
    }
    if (this.type === 'hr') return '[hr]';
    if (this.type === 'default') return DEFAULT_MARKER;
    // Filter out media blocks (image, video, audio) - BBCode doesn't have standard support
    if (this.isMediaBlock()) {
      return '';
    }
    if (this.type === 'heading') block = `h${this.props.level}`;

    if (block === null && text === null)
      throw new Error(`Unsupported block type: ${this.type}`);

    text ??= `[${block}]${this.content
      .map((child) => child.toBBCodeString())
      .join('')}[/${block}]`;

    if (this.props.textColor && this.props.textColor !== 'default') {
      text = `[color=${this.props.textColor}]${text}[/color]`;
    }

    return text;
  }
}

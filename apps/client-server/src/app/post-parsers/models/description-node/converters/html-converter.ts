import { encode } from 'html-entities';
import {
  ConversionContext,
  IDescriptionBlockNodeClass,
  IDescriptionInlineNodeClass,
  IDescriptionTextNodeClass,
} from '../description-node.base';
import { BaseConverter } from './base-converter';

export class HtmlConverter extends BaseConverter {
  /** Pixels of margin-left per nesting level */
  private static readonly INDENT_PX = 20;

  protected getBlockSeparator(): string {
    return '';
  }

  convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): string {
    // Handle special block types
    if (node.type === 'defaultShortcut') {
      return this.convertRawBlocks(context.defaultDescription, context);
    }

    if (node.type === 'divider') return '<hr>';
    if (node.type === 'image') return this.convertImage(node);
    if (node.type === 'video') return this.convertVideo(node);
    if (node.type === 'audio') return this.convertAudio(node);

    // Regular blocks
    const tag = this.getBlockTag(node);
    const styles = this.getBlockStyles(node);
    const content = (
      node.content as Array<
        IDescriptionInlineNodeClass | IDescriptionTextNodeClass
      >
    )
      .map((child) => {
        if (child.type === 'text') {
          return this.convertTextNode(
            child as IDescriptionTextNodeClass,
            context,
          );
        }
        return this.convertInlineNode(
          child as IDescriptionInlineNodeClass,
          context,
        );
      })
      .join('');

    let result = `<${tag}${styles ? ` style="${styles}"` : ''}>${content}</${tag}>`;

    // Process children with indentation
    if (node.children && node.children.length > 0) {
      // Calculate indent based on the depth level the children will be at (current + 1)
      const indentPx = (this.currentDepth + 1) * HtmlConverter.INDENT_PX;
      const childrenHtml = this.convertChildren(node.children, context);
      if (childrenHtml) {
        result += `<div style="margin-left: ${indentPx}px">${childrenHtml}</div>`;
      }
    }

    return result;
  }

  convertInlineNode(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): string {
    // System shortcuts are atomic nodes with no content
    const atomicTypes = ['customShortcut', 'titleShortcut', 'tagsShortcut', 'contentWarningShortcut'];
    if (!node.content.length && !atomicTypes.includes(node.type)) return '';

    if (node.type === 'link') {
      const content = (node.content as IDescriptionTextNodeClass[])
        .map((child) => this.convertTextNode(child, context))
        .join('');
      return `<a target="_blank" href="${
        node.href ?? node.props.href
      }">${content}</a>`;
    }

    if (node.type === 'username') {
      if (!node.content.length) return '';
      if (!this.shouldRenderUsernameShortcut(node, context)) return '';

      const sc = this.getUsernameShortcutLink(node, context);
      if (!sc) return '';
      if (!sc.url.startsWith('http')) return `<span>${sc.url}</span>`;
      return `<a target="_blank" href="${sc.url}">${sc.username}</a>`;
    }

    if (node.type === 'customShortcut') {
      const shortcutBlocks = context.customShortcuts.get(node.props.id);
      if (shortcutBlocks) {
        return this.convertRawBlocks(shortcutBlocks, context);
      }
      return '';
    }

    if (node.type === 'titleShortcut') {
      return context.title ? `<span>${encode(context.title, { level: 'html5' })}</span>` : '';
    }

    if (node.type === 'tagsShortcut') {
      return context.tags?.length ? `<span>${context.tags.map(t => encode(t, { level: 'html5' })).join(' ')}</span>` : '';
    }

    if (node.type === 'contentWarningShortcut') {
      return context.contentWarningText ? `<span>${encode(context.contentWarningText, { level: 'html5' })}</span>` : '';
    }

    const content = (node.content as IDescriptionTextNodeClass[])
      .map((child) => this.convertTextNode(child, context))
      .join('');
    return `<span>${content}</span>`;
  }

  convertTextNode(
    node: IDescriptionTextNodeClass,
    context: ConversionContext,
  ): string {
    if (!node.text) return '';

    // Handle line breaks from merged blocks
    if (node.text === '\n' || node.text === '\r\n') {
      return '<br>';
    }

    const segments: string[] = [];
    const styles: string[] = [];

    if (node.styles.bold) segments.push('b');
    if (node.styles.italic) segments.push('i');
    if (node.styles.underline) segments.push('u');
    if (node.styles.strike) segments.push('s');

    if (node.styles.textColor && node.styles.textColor !== 'default') {
      styles.push(`color: ${node.styles.textColor}`);
    }

    if (
      node.styles.backgroundColor &&
      node.styles.backgroundColor !== 'default'
    ) {
      styles.push(`background-color: ${node.styles.backgroundColor}`);
    }

    const text = encode(node.text, { level: 'html5' }).replace(/\n/g, '<br />');

    if (!segments.length && !styles.length) {
      return text;
    }

    const stylesString = styles.join(';');
    return `<span${
      stylesString.length ? ` style="${stylesString}"` : ''
    }>${segments.map((s) => `<${s}>`).join('')}${text}${segments
      .reverse()
      .map((s) => `</${s}>`)
      .join('')}</span>`;
  }

  private getBlockTag(node: IDescriptionBlockNodeClass): string {
    if (node.type === 'paragraph') return 'div';
    if (node.type === 'heading') return `h${node.props.level}`;
    return 'div';
  }

  private getBlockStyles(node: IDescriptionBlockNodeClass): string {
    const styles: string[] = [];
    if (node.props.textColor && node.props.textColor !== 'default') {
      styles.push(`color: ${node.props.textColor}`);
    }
    if (
      node.props.backgroundColor &&
      node.props.backgroundColor !== 'default'
    ) {
      styles.push(`background-color: ${node.props.backgroundColor}`);
    }
    if (
      node.props.textAlignment &&
      node.props.textAlignment !== 'default' &&
      node.props.textAlignment !== 'left'
    ) {
      styles.push(`text-align: ${node.props.textAlignment}`);
    }
    return styles.join(';');
  }

  private convertImage(node: IDescriptionBlockNodeClass): string {
    const src = node.props.url || '';
    const alt = node.props.name || node.props.caption || '';
    const caption = node.props.caption || '';
    const width = node.props.previewWidth || '';
    const align =
      node.props.textAlignment &&
      node.props.textAlignment !== 'default' &&
      node.props.textAlignment !== 'left'
        ? node.props.textAlignment
        : '';

    let imgTag = `<img src="${src}" alt="${alt}"`;
    if (width) imgTag += ` width="${width}"`;
    if (align) imgTag += ` style="text-align: ${align}"`;
    imgTag += '>';

    if (caption) {
      return `<div><figure>${imgTag}<figcaption>${caption}</figcaption></figure></div>`;
    }
    return `<div>${imgTag}</div>`;
  }

  private convertVideo(node: IDescriptionBlockNodeClass): string {
    const src = node.props.url || '';
    const caption = node.props.caption || '';
    const width = node.props.previewWidth || '';
    const align =
      node.props.textAlignment &&
      node.props.textAlignment !== 'default' &&
      node.props.textAlignment !== 'left'
        ? node.props.textAlignment
        : '';

    let videoTag = `<video controls`;
    if (width) videoTag += ` width="${width}"`;
    if (align) videoTag += ` style="text-align: ${align}"`;
    videoTag += `><source src="${src}">Your browser does not support the video tag.</video>`;

    if (caption) {
      return `<div><figure>${videoTag}<figcaption>${caption}</figcaption></figure></div>`;
    }
    return `<div>${videoTag}</div>`;
  }

  private convertAudio(node: IDescriptionBlockNodeClass): string {
    const src = node.props.url || '';
    const caption = node.props.caption || '';
    const audioTag = `<audio controls><source src="${src}">Your browser does not support the audio tag.</audio>`;

    if (caption) {
      return `<div><figure>${audioTag}<figcaption>${caption}</figcaption></figure></div>`;
    }
    return `<div>${audioTag}</div>`;
  }
}

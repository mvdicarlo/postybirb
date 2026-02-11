/* eslint-disable @typescript-eslint/no-explicit-any */
import { encode } from 'html-entities';
import { ConversionContext } from '../description-node.base';
import { TipTapNode } from '../description-node.types';
import { BaseConverter } from './base-converter';

export class HtmlConverter extends BaseConverter {
  protected getBlockSeparator(): string {
    return '';
  }

  convertBlockNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const attrs = node.attrs ?? {};

    // Handle special block types
    if (node.type === 'defaultShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return this.convertRawBlocks(context.defaultDescription, context);
    }

    if (node.type === 'horizontalRule') return '<hr>';
    if (node.type === 'image') return this.convertImage(node);
    if (node.type === 'hardBreak') return '<br>';

    // List containers: render as <ul>/<ol> wrapping children
    if (node.type === 'bulletList') {
      const items = (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('');
      return `<ul>${items}</ul>`;
    }

    if (node.type === 'orderedList') {
      const items = (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('');
      return `<ol>${items}</ol>`;
    }

    if (node.type === 'listItem') {
      // listItem content is typically [paragraph, ...]. Render inline content of inner paragraphs.
      const inner = (node.content ?? [])
        .map((child) => {
          if (child.type === 'paragraph') {
            return this.convertContent(child.content, context);
          }
          return this.convertBlockNode(child, context);
        })
        .join('');
      return `<li>${inner}</li>`;
    }

    if (node.type === 'blockquote') {
      const inner = (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('');
      return `<blockquote>${inner}</blockquote>`;
    }

    // Regular blocks: paragraph, heading, etc.
    const tag = this.getBlockTag(node);
    const styles = this.getBlockStyles(node);
    const content = this.convertContent(node.content, context);

    return `<${tag}${styles ? ` style="${styles}"` : ''}>${content}</${tag}>`;
  }

  convertInlineNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const attrs = node.attrs ?? {};

    if (node.type === 'username') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      const sc = this.getUsernameShortcutLink(node, context);
      if (!sc) return '';
      if (!sc.url.startsWith('http')) return `<span>${sc.url}</span>`;
      return `<a target="_blank" href="${sc.url}">${sc.username}</a>`;
    }

    if (node.type === 'customShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      const shortcutBlocks = context.customShortcuts.get(attrs.id);
      if (shortcutBlocks) {
        return this.convertRawBlocks(shortcutBlocks, context);
      }
      return '';
    }

    if (node.type === 'titleShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return context.title
        ? `<span>${encode(context.title, { level: 'html5' })}</span>`
        : '';
    }

    if (node.type === 'tagsShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return context.tags?.length
        ? `<span>${context.tags.map((t) => encode(`#${t}`, { level: 'html5' })).join(' ')}</span>`
        : '';
    }

    if (node.type === 'contentWarningShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return context.contentWarningText
        ? `<span>${encode(context.contentWarningText, { level: 'html5' })}</span>`
        : '';
    }

    if (node.type === 'hardBreak') return '<br>';

    // Fallback: render content
    const content = this.convertContent(node.content, context);
    return content ? `<span>${content}</span>` : '';
  }

  convertTextNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const textNode = node as any;
    if (!textNode.text) return '';

    // Handle line breaks from merged blocks
    if (textNode.text === '\n' || textNode.text === '\r\n') {
      return '<br>';
    }

    const marks = textNode.marks ?? [];
    const segments: string[] = [];
    const styles: string[] = [];

    // Check for link mark — wrap entire text in <a>
    const linkMark = marks.find((m: any) => m.type === 'link');
    if (linkMark) {
      const href = linkMark.attrs?.href ?? '';
      const innerHtml = this.renderTextWithMarks(textNode.text, marks.filter((m: any) => m.type !== 'link'));
      return `<a target="_blank" href="${href}">${innerHtml}</a>`;
    }

    return this.renderTextWithMarks(textNode.text, marks);
  }

  /**
   * Renders text with formatting marks (bold, italic, etc.) applied.
   */
  private renderTextWithMarks(text: string, marks: any[]): string {
    const segments: string[] = [];
    const styles: string[] = [];

    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          segments.push('b');
          break;
        case 'italic':
          segments.push('i');
          break;
        case 'underline':
          segments.push('u');
          break;
        case 'strike':
          segments.push('s');
          break;
        default:
          break;
      }
    }

    // Check for textStyle mark with color
    const textStyleMark = marks.find((m: any) => m.type === 'textStyle');
    if (textStyleMark?.attrs?.color) {
      styles.push(`color: ${textStyleMark.attrs.color}`);
    }

    const encodedText = encode(text, { level: 'html5' }).replace(/\n/g, '<br />');

    if (!segments.length && !styles.length) {
      return encodedText;
    }

    const stylesString = styles.join(';');
    return `<span${
      stylesString.length ? ` style="${stylesString}"` : ''
    }>${segments.map((s) => `<${s}>`).join('')}${encodedText}${segments
      .reverse()
      .map((s) => `</${s}>`)
      .join('')}</span>`;
  }

  private getBlockTag(node: TipTapNode): string {
    const attrs = node.attrs ?? {};
    if (node.type === 'paragraph') return 'div';
    if (node.type === 'heading') return `h${attrs.level ?? 1}`;
    return 'div';
  }

  private getBlockStyles(node: TipTapNode): string {
    const attrs = node.attrs ?? {};
    const styles: string[] = [];

    if (
      attrs.textAlign &&
      attrs.textAlign !== 'left'
    ) {
      styles.push(`text-align: ${attrs.textAlign}`);
    }

    if (attrs.indent && attrs.indent > 0) {
      styles.push(`margin-left: ${attrs.indent * 2}em`);
    }

    return styles.join(';');
  }

  private convertImage(node: TipTapNode): string {
    const attrs = node.attrs ?? {};
    const src = attrs.src || '';
    const alt = attrs.alt || '';
    const width = attrs.width || '';
    const height = attrs.height || '';

    let imgTag = `<img src="${src}" alt="${alt}"`;
    if (width) imgTag += ` width="${width}"`;
    if (height) imgTag += ` height="${height}"`;
    imgTag += '>';

    return `<div>${imgTag}</div>`;
  }
}


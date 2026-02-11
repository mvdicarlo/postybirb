/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConversionContext } from '../description-node.base';
import { TipTapNode } from '../description-node.types';
import { BaseConverter } from './base-converter';

export class BBCodeConverter extends BaseConverter {
  protected getBlockSeparator(): string {
    return '\n';
  }

  convertBlockNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const attrs = node.attrs ?? {};

    if (node.type === 'defaultShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return this.convertRawBlocks(context.defaultDescription, context);
    }

    // For FA: More than 5 dashes in a line are replaced with a horizontal divider.
    if (node.type === 'horizontalRule') return '--------';

    if (node.type === 'image') return '';
    if (node.type === 'hardBreak') return '\n';

    // List containers
    if (node.type === 'bulletList') {
      return (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('\n');
    }

    if (node.type === 'orderedList') {
      return (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('\n');
    }

    if (node.type === 'listItem') {
      const inner = (node.content ?? [])
        .map((child) => {
          if (child.type === 'paragraph') {
            return this.convertContent(child.content, context);
          }
          return this.convertBlockNode(child, context);
        })
        .join('');
      return `• ${inner}`;
    }

    if (node.type === 'blockquote') {
      const inner = (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('\n');
      return `[quote]${inner}[/quote]`;
    }

    if (node.type === 'paragraph') {
      let text = this.convertContent(node.content, context);

      // Apply text alignment if not default
      if (attrs.textAlign && attrs.textAlign !== 'left') {
        text = `[${attrs.textAlign}]${text}[/${attrs.textAlign}]`;
      }

      // Apply indentation
      if (attrs.indent && attrs.indent > 0) {
        const spaces = '\u00A0\u00A0\u00A0\u00A0'.repeat(attrs.indent);
        text = `${spaces}${text}`;
      }

      return text;
    }

    if (node.type === 'heading') {
      const level = attrs.level ?? 1;
      let text = `[h${level}]${this.convertContent(node.content, context)}[/h${level}]`;

      if (attrs.textAlign && attrs.textAlign !== 'left') {
        text = `[${attrs.textAlign}]${text}[/${attrs.textAlign}]`;
      }

      if (attrs.indent && attrs.indent > 0) {
        const spaces = '\u00A0\u00A0\u00A0\u00A0'.repeat(attrs.indent);
        text = `${spaces}${text}`;
      }

      return text;
    }

    // Fallback
    return this.convertContent(node.content, context);
  }

  convertInlineNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const attrs = node.attrs ?? {};

    if (node.type === 'username') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      const sc = this.getUsernameShortcutLink(node, context);
      if (sc?.url.startsWith('http')) {
        return `[url=${sc.url}]${sc.username}[/url]`;
      }
      return sc ? `${sc.url ?? sc.username}` : '';
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
      return context.title ?? '';
    }

    if (node.type === 'tagsShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return context.tags?.map((e) => `#${e}`).join(' ') ?? '';
    }

    if (node.type === 'contentWarningShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      return context.contentWarningText ?? '';
    }

    if (node.type === 'hardBreak') return '\n';

    return this.convertContent(node.content, context);
  }

  convertTextNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const textNode = node as any;
    if (!textNode.text) return '';

    if (textNode.text === '\n' || textNode.text === '\r\n') {
      return '\n';
    }

    const marks = textNode.marks ?? [];

    // Check for link mark
    const linkMark = marks.find((m: any) => m.type === 'link');
    if (linkMark) {
      const href = linkMark.attrs?.href ?? '';
      const innerText = this.renderTextWithMarks(textNode.text, marks.filter((m: any) => m.type !== 'link'));
      return `[url=${href}]${innerText}[/url]`;
    }

    return this.renderTextWithMarks(textNode.text, marks);
  }

  /**
   * Renders text with BBCode formatting marks applied.
   */
  private renderTextWithMarks(text: string, marks: any[]): string {
    const segments: string[] = [];

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

    if (!segments.length) {
      return text;
    }

    let segmentedText = `${segments.map((e) => `[${e}]`).join('')}${text}${segments
      .reverse()
      .map((e) => `[/${e}]`)
      .join('')}`;

    // Check for textStyle mark with color
    const textStyleMark = marks.find((m: any) => m.type === 'textStyle');
    if (textStyleMark?.attrs?.color) {
      segmentedText = `[color=${textStyleMark.attrs.color}]${segmentedText}[/color]`;
    }

    return segmentedText;
  }
}


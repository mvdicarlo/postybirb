/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConversionContext } from '../description-node.base';
import { TipTapNode } from '../description-node.types';
import { BaseConverter } from './base-converter';

export class PlainTextConverter extends BaseConverter {
  protected getBlockSeparator(): string {
    return '\r\n';
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

    if (node.type === 'horizontalRule') return '----------';
    if (node.type === 'image') return '';
    if (node.type === 'hardBreak') return '\r\n';

    // List containers
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return (node.content ?? [])
        .map((child) => this.convertBlockNode(child, context))
        .join('\r\n');
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
      return `- ${inner}`;
    }

    if (node.type === 'blockquote') {
      return (node.content ?? [])
        .map((child) => {
          const text = this.convertBlockNode(child, context);
          return `> ${text}`;
        })
        .join('\r\n');
    }

    // Indent paragraph/heading content
    if (node.type === 'paragraph' || node.type === 'heading') {
      const attrs = node.attrs ?? {};
      let text = this.convertContent(node.content, context);
      if (attrs.indent && attrs.indent > 0) {
        const spaces = '    '.repeat(attrs.indent);
        text = `${spaces}${text}`;
      }
      return text;
    }

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
      return sc ? sc.url : '';
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

    if (node.type === 'hardBreak') return '\r\n';

    return this.convertContent(node.content, context);
  }

  convertTextNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const textNode = node as any;

    // Check for link mark — append URL
    const marks = textNode.marks ?? [];
    const linkMark = marks.find((m: any) => m.type === 'link');
    if (linkMark) {
      return `${textNode.text}: ${linkMark.attrs?.href ?? ''}`;
    }

    return textNode.text ?? '';
  }
}


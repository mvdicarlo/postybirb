/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConversionContext } from '../description-node.base';
import { isTextNode, TipTapNode } from '../description-node.types';
import { BaseConverter } from './base-converter';

/**
 * Tumblr NPF (Nuevo Post Format) content block types.
 * @see https://www.tumblr.com/docs/npf
 */
export type NPFContentBlock =
  | NPFTextBlock
  | NPFImageBlock
  | NPFLinkBlock
  | NPFAudioBlock
  | NPFVideoBlock;

export interface NPFTextBlock {
  type: 'text';
  text: string;
  subtype?:
    | 'heading1'
    | 'heading2'
    | 'quote'
    | 'indented'
    | 'chat'
    | 'ordered-list-item'
    | 'unordered-list-item'
    | 'quirky';
  indent_level?: number;
  formatting?: NPFInlineFormatting[];
}

export interface NPFInlineFormatting {
  start: number;
  end: number;
  type:
    | 'bold'
    | 'italic'
    | 'strikethrough'
    | 'small'
    | 'link'
    | 'mention'
    | 'color';
  url?: string;
  blog?: { uuid: string };
  hex?: string;
}

export interface NPFImageBlock {
  type: 'image';
  media: NPFMediaObject[];
  alt_text?: string;
  caption?: string;
  colors?: Record<string, string>;
}

export interface NPFMediaObject {
  url: string;
  type?: string;
  width?: number;
  height?: number;
  original_dimensions_missing?: boolean;
}

export interface NPFLinkBlock {
  type: 'link';
  url: string;
  title?: string;
  description?: string;
  author?: string;
  site_name?: string;
  display_url?: string;
  poster?: NPFMediaObject[];
}

export interface NPFAudioBlock {
  type: 'audio';
  provider?: string;
  url?: string;
  media?: NPFMediaObject;
  title?: string;
  artist?: string;
  album?: string;
  poster?: NPFMediaObject[];
}

export interface NPFVideoBlock {
  type: 'video';
  provider?: string;
  url?: string;
  media?: NPFMediaObject;
  poster?: NPFMediaObject[];
  embed_html?: string;
  embed_url?: string;
}

/**
 * Converter that outputs Tumblr NPF (Nuevo Post Format) blocks.
 */
export class NpfConverter extends BaseConverter {
  private currentFormatting: NPFInlineFormatting[] = [];

  private currentPosition = 0;

  private blocks: NPFContentBlock[] = [];

  protected getBlockSeparator(): string {
    return '';
  }

  /**
   * Override convertBlocks to accumulate NPF blocks and return JSON.
   */
  convertBlocks(nodes: TipTapNode[], context: ConversionContext): string {
    this.blocks = [];
    for (const node of nodes) {
      this.convertBlockNodeRecursive(node, context, 0);
    }
    return JSON.stringify(this.blocks);
  }

  /**
   * Recursively converts a block node and its children to NPF blocks.
   */
  private convertBlockNodeRecursive(
    node: TipTapNode,
    context: ConversionContext,
    indentLevel: number,
  ): void {
    if (node.type === 'defaultShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return;
      if (context.defaultDescription && context.defaultDescription.length > 0) {
        for (const defaultBlock of context.defaultDescription) {
          this.convertBlockNodeRecursive(defaultBlock, context, indentLevel);
        }
      }
      return;
    }

    // Handle list containers — recurse into items
    if (node.type === 'bulletList') {
      for (const item of node.content ?? []) {
        this.convertListItemToNpf(item, context, 'unordered-list-item', indentLevel);
      }
      return;
    }

    if (node.type === 'orderedList') {
      for (const item of node.content ?? []) {
        this.convertListItemToNpf(item, context, 'ordered-list-item', indentLevel);
      }
      return;
    }

    if (node.type === 'blockquote') {
      for (const child of node.content ?? []) {
        const block = this.convertBlockNodeToNpf(child, context);
        if (block.type === 'text') {
          block.subtype = 'quote';
        }
        this.blocks.push(block);
      }
      return;
    }

    const block = this.convertBlockNodeToNpf(node, context);

    // Apply indent_level for nested blocks (NPF supports 0-7)
    if (indentLevel > 0 && block.type === 'text' && indentLevel <= 7) {
      block.indent_level = indentLevel;
      if (!block.subtype) {
        block.subtype = 'indented';
      }
    }

    this.blocks.push(block);
  }

  /**
   * Convert a listItem node to NPF text block with appropriate subtype.
   */
  private convertListItemToNpf(
    node: TipTapNode,
    context: ConversionContext,
    subtype: 'ordered-list-item' | 'unordered-list-item',
    indentLevel: number,
  ): void {
    // listItem typically contains [paragraph, ...nested lists]
    for (const child of node.content ?? []) {
      if (child.type === 'paragraph') {
        this.currentFormatting = [];
        this.currentPosition = 0;
        const text = this.extractText(child.content ?? [], context);
        const npfBlock: NPFTextBlock = {
          type: 'text',
          text,
          subtype,
          formatting: this.currentFormatting.length > 0 ? this.currentFormatting : undefined,
        };
        if (indentLevel > 0 && indentLevel <= 7) {
          npfBlock.indent_level = indentLevel;
        }
        this.blocks.push(npfBlock);
      } else if (child.type === 'bulletList') {
        for (const item of child.content ?? []) {
          this.convertListItemToNpf(item, context, 'unordered-list-item', indentLevel + 1);
        }
      } else if (child.type === 'orderedList') {
        for (const item of child.content ?? []) {
          this.convertListItemToNpf(item, context, 'ordered-list-item', indentLevel + 1);
        }
      } else {
        this.convertBlockNodeRecursive(child, context, indentLevel);
      }
    }
  }

  /**
   * Stub method required by BaseConverter interface.
   */
  convertBlockNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const block = this.convertBlockNodeToNpf(node, context);
    return JSON.stringify(block);
  }

  /**
   * Internal method that returns a single NPF block.
   */
  private convertBlockNodeToNpf(
    node: TipTapNode,
    context: ConversionContext,
  ): NPFContentBlock {
    this.currentFormatting = [];
    this.currentPosition = 0;
    const attrs = node.attrs ?? {};

    switch (node.type) {
      case 'paragraph':
        return this.convertParagraph(node, context);
      case 'heading':
        return this.convertHeading(node, context);
      case 'image':
        return this.convertImage(node);
      case 'horizontalRule':
        return { type: 'text', text: '' };
      case 'defaultShortcut':
        return { type: 'text', text: '' };
      default:
        return this.convertParagraph(node, context);
    }
  }

  private convertParagraph(
    node: TipTapNode,
    context: ConversionContext,
  ): NPFTextBlock {
    const text = this.extractText(node.content ?? [], context);
    const formatting =
      this.currentFormatting.length > 0 ? this.currentFormatting : undefined;
    return { type: 'text', text, formatting };
  }

  private convertHeading(
    node: TipTapNode,
    context: ConversionContext,
  ): NPFTextBlock {
    const text = this.extractText(node.content ?? [], context);
    const level = parseInt(node.attrs?.level || '1', 10);
    const subtype = level === 1 ? 'heading1' : 'heading2';
    return {
      type: 'text',
      text,
      subtype,
      formatting:
        this.currentFormatting.length > 0 ? this.currentFormatting : undefined,
    };
  }

  private convertImage(node: TipTapNode): NPFImageBlock {
    const attrs = node.attrs ?? {};
    const url = attrs.src || '';
    const alt = attrs.alt || '';
    const width = attrs.width ? parseInt(String(attrs.width), 10) : undefined;
    const height = attrs.height ? parseInt(String(attrs.height), 10) : undefined;

    const media: NPFMediaObject[] = [
      {
        url,
        type: this.getMimeType(url),
        width: width || undefined,
        height: height || undefined,
      },
    ];

    const imageBlock: NPFImageBlock = {
      type: 'image',
      media,
      alt_text: alt || undefined,
    };

    return imageBlock;
  }

  convertInlineNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    const attrs = node.attrs ?? {};
    const startPos = this.currentPosition;
    let text = '';

    if (node.type === 'customShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      const shortcutBlocks = context.customShortcuts.get(attrs.id);
      if (shortcutBlocks) {
        for (const block of shortcutBlocks) {
          text += this.extractText(block.content ?? [], context);
        }
      }
      return text;
    }

    if (node.type === 'username') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      const sc = this.getUsernameShortcutLink(node, context);
      if (!sc) {
        text = attrs.username ?? '';
      } else if (!sc.url.startsWith('http')) {
        text = sc.url;
      } else {
        text = sc.username;
        if (text.length > 0) {
          this.currentFormatting.push({
            start: startPos,
            end: startPos + text.length,
            type: 'link',
            url: sc.url,
          });
        }
      }
      this.currentPosition += text.length;
      return text;
    }

    if (node.type === 'titleShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      text = context.title ?? '';
      this.currentPosition += text.length;
      return text;
    }

    if (node.type === 'tagsShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      text = context.tags?.map((e) => `#${e}`).join(' ') ?? '';
      this.currentPosition += text.length;
      return text;
    }

    if (node.type === 'contentWarningShortcut') {
      if (!this.shouldRenderShortcut(node, context)) return '';
      text = context.contentWarningText ?? '';
      this.currentPosition += text.length;
      return text;
    }

    if (node.type === 'hardBreak') {
      text = '\n';
      this.currentPosition += text.length;
      return text;
    }

    // Generic inline: extract text from content
    text = this.extractText(node.content ?? [], context);
    return text;
  }

  convertTextNode(node: TipTapNode): string {
    const textNode = node as any;
    const startPos = this.currentPosition;
    const text = textNode.text ?? '';
    this.currentPosition += text.length;

    const marks = textNode.marks ?? [];

    // Add link formatting
    const linkMark = marks.find((m: any) => m.type === 'link');
    if (linkMark && text.length > 0) {
      this.currentFormatting.push({
        start: startPos,
        end: this.currentPosition,
        type: 'link',
        url: linkMark.attrs?.href || '',
      });
    }

    // Add text formatting from marks
    this.addFormattingForMarks(marks, startPos, this.currentPosition);

    return text;
  }

  /**
   * Extracts plain text from content array and builds formatting.
   */
  private extractText(
    content: TipTapNode[],
    context: ConversionContext,
  ): string {
    let text = '';
    for (const node of content) {
      if (isTextNode(node)) {
        text += this.convertTextNode(node);
      } else {
        text += this.convertInlineNode(node, context);
      }
    }
    return text;
  }

  /**
   * Adds formatting entries for marks on a text node.
   */
  private addFormattingForMarks(
    marks: any[],
    start: number,
    end: number,
  ): void {
    if (!marks || start === end) return;

    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          this.currentFormatting.push({ start, end, type: 'bold' });
          break;
        case 'italic':
          this.currentFormatting.push({ start, end, type: 'italic' });
          break;
        case 'strike':
          this.currentFormatting.push({
            start,
            end,
            type: 'strikethrough',
          });
          break;
        case 'textStyle':
          if (mark.attrs?.color) {
            this.currentFormatting.push({
              start,
              end,
              type: 'color',
              hex: mark.attrs.color,
            });
          }
          break;
        default:
          break;
      }
    }
  }

  /**
   * Gets MIME type from file URL.
   */
  private getMimeType(url: string): string | undefined {
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mp3',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
    };
    return ext ? mimeMap[ext] : undefined;
  }
}


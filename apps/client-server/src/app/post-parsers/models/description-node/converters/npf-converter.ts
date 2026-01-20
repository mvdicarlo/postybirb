import {
  ConversionContext,
  IDescriptionBlockNodeClass,
  IDescriptionInlineNodeClass,
  IDescriptionTextNodeClass,
} from '../description-node.base';
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

/**
 * NPF Text Block
 */
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

/**
 * NPF Inline Formatting
 */
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
  url?: string; // For link type
  blog?: {
    uuid: string;
  }; // For mention type
  hex?: string; // For color type
}

/**
 * NPF Image Block
 */
export interface NPFImageBlock {
  type: 'image';
  media: NPFMediaObject[];
  alt_text?: string;
  caption?: string;
  colors?: Record<string, string>;
}

/**
 * NPF Media Object
 */
export interface NPFMediaObject {
  url: string;
  type?: string;
  width?: number;
  height?: number;
  original_dimensions_missing?: boolean;
}

/**
 * NPF Link Block
 */
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

/**
 * NPF Audio Block
 */
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

/**
 * NPF Video Block
 */
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
 * NPF is Tumblr's native rich content format.
 *
 * @see https://www.tumblr.com/docs/npf
 */
export class NpfConverter extends BaseConverter {
  private currentFormatting: NPFInlineFormatting[] = [];

  private currentPosition = 0;

  private blocks: NPFContentBlock[] = [];

  /**
   * NPF blocks are accumulated and serialized to JSON.
   */
  protected getBlockSeparator(): string {
    return '';
  }

  /**
   * Override convertBlocks to accumulate NPF blocks and return JSON.
   */
  convertBlocks(
    nodes: Array<
      IDescriptionBlockNodeClass & {
        accept<T>(converter: unknown, context: ConversionContext): T;
      }
    >,
    context: ConversionContext,
  ): string {
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
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
    indentLevel: number,
  ): void {
    const block = this.convertBlockNodeToNpf(node, context);

    // Apply indent_level for nested blocks (NPF supports 0-7)
    if (
      indentLevel > 0 &&
      block.type === 'text' &&
      indentLevel <= 7
    ) {
      block.indent_level = indentLevel;
      // Set subtype to indented if not already set
      if (!block.subtype) {
        block.subtype = 'indented';
      }
    }

    this.blocks.push(block);

    // Recursively process children with increased indent level
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.convertBlockNodeRecursive(
          child as IDescriptionBlockNodeClass,
          context,
          indentLevel + 1,
        );
      }
    }
  }

  /**
   * Stub method required by BaseConverter interface.
   * Returns JSON string of a single NPF block for compatibility.
   */
  convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): string {
    const block = this.convertBlockNodeToNpf(node, context);
    return JSON.stringify(block);
  }

  /**
   * Internal method that returns NPF blocks.
   */
  private convertBlockNodeToNpf(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): NPFContentBlock {
    // Reset state for each block
    this.currentFormatting = [];
    this.currentPosition = 0;

    switch (node.type) {
      case 'paragraph':
        return this.convertParagraph(node, context);
      case 'heading':
        return this.convertHeading(node, context);
      case 'image':
        return this.convertImage(node);
      case 'video':
        return this.convertVideo(node);
      case 'audio':
        return this.convertAudio(node);
      case 'divider':
        // Tumblr NPF doesn't have a horizontal rule, use empty text block
        return { type: 'text', text: '' };
      case 'defaultShortcut':
        // Default markers become empty text blocks
        return { type: 'text', text: '' };
      case 'titleShortcut':
        // Title shortcut becomes a heading2 text block
        if (!context.title) return { type: 'text', text: '' };
        return { type: 'text', text: context.title, subtype: 'heading2' };
      case 'tagsShortcut':
        // Tags shortcut becomes a plain text block with tags joined by space
        if (!context.tags || context.tags.length === 0)
          return { type: 'text', text: '' };
        return { type: 'text', text: context.tags.join(' ') };
      default:
        // Fallback to paragraph for unknown types
        return this.convertParagraph(node, context);
    }
  }

  /**
   * Converts a paragraph block to NPF text block.
   */
  private convertParagraph(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): NPFTextBlock {
    const text = this.extractText(
      node.content as IDescriptionInlineNodeClass[],
      context,
    );
    const formatting =
      this.currentFormatting.length > 0 ? this.currentFormatting : undefined;

    return {
      type: 'text',
      text,
      formatting,
    };
  }

  /**
   * Converts a heading block to NPF text block with subtype.
   */
  private convertHeading(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): NPFTextBlock {
    const text = this.extractText(
      node.content as IDescriptionInlineNodeClass[],
      context,
    );
    const level = parseInt(node.props.level || '1', 10);

    // NPF supports heading1 and heading2
    const subtype = level === 1 ? 'heading1' : 'heading2';

    return {
      type: 'text',
      text,
      subtype,
      formatting:
        this.currentFormatting.length > 0 ? this.currentFormatting : undefined,
    };
  }

  /**
   * Converts an image block to NPF image block.
   */
  private convertImage(node: IDescriptionBlockNodeClass): NPFImageBlock {
    const { url = '', name, caption, previewWidth, previewHeight } = node.props;
    const alt = name || caption || '';
    const width = parseInt(previewWidth || '0', 10) || undefined;
    const height = parseInt(previewHeight || '0', 10) || undefined;

    const media: NPFMediaObject[] = [
      {
        url,
        type: this.getMimeType(url),
        width,
        height,
      },
    ];

    const imageBlock: NPFImageBlock = {
      type: 'image',
      media,
      alt_text: alt,
    };

    if (caption) {
      imageBlock.caption = caption;
    }

    return imageBlock;
  }

  /**
   * Converts a video block to NPF video block.
   */
  private convertVideo(node: IDescriptionBlockNodeClass): NPFVideoBlock {
    const { url = '', caption, previewWidth, previewHeight } = node.props;
    const width = parseInt(previewWidth || '0', 10) || undefined;
    const height = parseInt(previewHeight || '0', 10) || undefined;

    const videoBlock: NPFVideoBlock = {
      type: 'video',
      provider: 'tumblr',
      url,
      media: {
        url,
        type: this.getMimeType(url),
        width,
        height,
      },
    };

    return videoBlock;
  }

  /**
   * Converts an audio block to NPF audio block.
   */
  private convertAudio(node: IDescriptionBlockNodeClass): NPFAudioBlock {
    const { url = '' } = node.props;

    const audioBlock: NPFAudioBlock = {
      type: 'audio',
      provider: 'tumblr',
      url,
      media: {
        url,
        type: this.getMimeType(url),
      },
    };

    return audioBlock;
  }

  convertInlineNode(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): string {
    const startPos = this.currentPosition;
    let text = '';

    if (node.type === 'customShortcut') {
      const shortcutBlocks = context.customShortcuts.get(node.props.id);
      if (shortcutBlocks) {
        // For NPF, we need to extract just the text from shortcut blocks
        // and merge it into the current text block
        for (const block of shortcutBlocks) {
          text += this.extractText(
            block.content as IDescriptionInlineNodeClass[],
            context,
          );
        }
      }
      return text;
    }

    if (node.type === 'username') {
      // Username shortcuts become plain text or links in NPF
      const sc = this.getUsernameShortcutLink(node, context);
      if (!sc) {
        text = node.props.username;
      } else if (!sc.url.startsWith('http')) {
        text = sc.url;
      } else {
        // Use the username from the shortcut result
        text = sc.username;

        // Add link formatting
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

    // Extract text from content
    for (const child of node.content as IDescriptionTextNodeClass[]) {
      text += child.text;
    }

    this.currentPosition += text.length;

    // Add formatting based on node type
    if (node.type === 'link' && text.length > 0) {
      this.currentFormatting.push({
        start: startPos,
        end: this.currentPosition,
        type: 'link',
        url: node.href || node.props.href || '',
      });
    }

    // Also check for any text formatting within the inline node
    let childStart = startPos;
    for (const child of node.content as IDescriptionTextNodeClass[]) {
      this.addFormattingForTextNode(
        child,
        childStart,
        childStart + child.text.length,
      );
      childStart += child.text.length;
    }

    return text;
  }

  convertTextNode(node: IDescriptionTextNodeClass): string {
    const startPos = this.currentPosition;
    const { text } = node;
    this.currentPosition += text.length;

    this.addFormattingForTextNode(node, startPos, this.currentPosition);

    return text;
  }

  /**
   * Extracts text from inline content and builds formatting array.
   */
  private extractText(
    content: IDescriptionInlineNodeClass[],
    context: ConversionContext,
  ): string {
    let text = '';

    for (const node of content) {
      if (node.type === 'text') {
        text += this.convertTextNode(
          node as unknown as IDescriptionTextNodeClass,
        );
      } else {
        text += this.convertInlineNode(node, context);
      }
    }

    return text;
  }

  /**
   * Adds formatting entries for a text node based on its styles.
   */
  private addFormattingForTextNode(
    node: IDescriptionTextNodeClass,
    start: number,
    end: number,
  ): void {
    const { styles } = node;

    if (!styles || start === end) return;

    if (styles.bold) {
      this.currentFormatting.push({
        start,
        end,
        type: 'bold',
      });
    }

    if (styles.italic) {
      this.currentFormatting.push({
        start,
        end,
        type: 'italic',
      });
    }

    if (styles.strike) {
      this.currentFormatting.push({
        start,
        end,
        type: 'strikethrough',
      });
    }

    // Handle text color
    if (styles.textColor && styles.textColor !== 'default') {
      this.currentFormatting.push({
        start,
        end,
        type: 'color',
        hex: styles.textColor as string,
      });
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

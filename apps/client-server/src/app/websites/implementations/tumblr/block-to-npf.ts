import { DescriptionBlockNode } from '../../../post-parsers/models/description-node/block-description-node';
import { DescriptionNode } from '../../../post-parsers/models/description-node/description-node.base';
import { DescriptionInlineNode } from '../../../post-parsers/models/description-node/inline-description-node';
import { DescriptionTextNode } from '../../../post-parsers/models/description-node/text-description-node';

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
  type: 'bold' | 'italic' | 'strikethrough' | 'small' | 'link' | 'mention' | 'color';
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
 * Converts PostyBirb description nodes to Tumblr's NPF format.
 */
export class BlockToNpfConverter {
  private currentFormatting: NPFInlineFormatting[] = [];

  private currentPosition = 0;

  /**
   * Converts a DescriptionNode to NPF content blocks.
   */
  public convert(node: DescriptionNode): NPFContentBlock[] {
    if (node instanceof DescriptionBlockNode) {
      return this.convertBlock(node);
    }
    return [];
  }

  /**
   * Converts a block node to NPF content blocks.
   */
  private convertBlock(block: DescriptionBlockNode): NPFContentBlock[] {
    // Handle different block types
    switch (block.type) {
      case 'paragraph':
        return this.convertParagraph(block);
      case 'heading':
        return this.convertHeading(block);
      case 'image':
        return this.convertImage(block);
      case 'video':
        return this.convertVideo(block);
      case 'audio':
        return this.convertAudio(block);
      case 'hr':
        // Tumblr NPF doesn't have a horizontal rule, use empty text block
        return [{ type: 'text', text: '' }];
      case 'default':
        // Skip default markers
        return [];
      default:
        // Fallback to paragraph for unknown types
        return this.convertParagraph(block);
    }
  }

  /**
   * Converts a paragraph block to NPF text block.
   */
  private convertParagraph(block: DescriptionBlockNode): NPFContentBlock[] {
    this.currentFormatting = [];
    this.currentPosition = 0;

    const text = this.extractText(block.content);
    const formatting = this.currentFormatting.length > 0 ? this.currentFormatting : undefined;

    return [
      {
        type: 'text',
        text,
        formatting,
      },
    ];
  }

  /**
   * Converts a heading block to NPF text block with subtype.
   */
  private convertHeading(block: DescriptionBlockNode): NPFContentBlock[] {
    this.currentFormatting = [];
    this.currentPosition = 0;

    const text = this.extractText(block.content);
    const level = parseInt(block.props.level || '1', 10);
    
    // NPF supports heading1 and heading2
    const subtype = level === 1 ? 'heading1' : 'heading2';

    return [
      {
        type: 'text',
        text,
        subtype,
        formatting: this.currentFormatting.length > 0 ? this.currentFormatting : undefined,
      },
    ];
  }

  /**
   * Converts an image block to NPF image block.
   */
  private convertImage(block: DescriptionBlockNode): NPFContentBlock[] {
    const { url = '', name, caption, previewWidth, previewHeight } = block.props;
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

    return [imageBlock];
  }

  /**
   * Converts a video block to NPF video block.
   */
  private convertVideo(block: DescriptionBlockNode): NPFContentBlock[] {
    const { url = '', caption, previewWidth, previewHeight } = block.props;
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

    const blocks: NPFContentBlock[] = [videoBlock];

    // Add caption as a separate text block if present
    if (caption) {
      blocks.push({
        type: 'text',
        text: caption,
      });
    }

    return blocks;
  }

  /**
   * Converts an audio block to NPF audio block.
   */
  private convertAudio(block: DescriptionBlockNode): NPFContentBlock[] {
    const { url = '', caption } = block.props;

    const audioBlock: NPFAudioBlock = {
      type: 'audio',
      provider: 'tumblr',
      url,
      media: {
        url,
        type: this.getMimeType(url),
      },
    };

    const blocks: NPFContentBlock[] = [audioBlock];

    // Add caption as a separate text block if present
    if (caption) {
      blocks.push({
        type: 'text',
        text: caption,
      });
    }

    return blocks;
  }

  /**
   * Extracts text from inline content and builds formatting array.
   */
  private extractText(
    content: Array<DescriptionInlineNode | DescriptionTextNode>,
  ): string {
    let text = '';

    for (const node of content) {
      if (node instanceof DescriptionTextNode) {
        const startPos = this.currentPosition;
        const nodeText = node.text;
        text += nodeText;
        this.currentPosition += nodeText.length;

        // Add formatting for this text node
        this.addFormattingForTextNode(node, startPos, this.currentPosition);
      } else if (node instanceof DescriptionInlineNode) {
        text += this.extractInlineNode(node);
      }
    }

    return text;
  }

  /**
   * Extracts text from an inline node and adds appropriate formatting.
   */
  private extractInlineNode(node: DescriptionInlineNode): string {
    const startPos = this.currentPosition;
    let text = '';

    // Extract text from content
    for (const child of node.content) {
      if (child instanceof DescriptionTextNode) {
        text += child.text;
      }
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
    for (const child of node.content) {
      if (child instanceof DescriptionTextNode) {
        this.addFormattingForTextNode(child, startPos, startPos + child.text.length);
      }
    }

    return text;
  }

  /**
   * Adds formatting entries for a text node based on its styles.
   */
  private addFormattingForTextNode(
    node: DescriptionTextNode,
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

/**
 * Converts a description tree to NPF content blocks.
 */
export function convertToNpf(node: DescriptionNode): NPFContentBlock[] {
  const converter = new BlockToNpfConverter();
  return converter.convert(node);
}

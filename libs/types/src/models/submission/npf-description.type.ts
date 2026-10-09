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

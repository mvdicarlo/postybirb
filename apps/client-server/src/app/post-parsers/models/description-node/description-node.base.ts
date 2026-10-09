import { UsernameShortcut } from '@postybirb/types';
import { TipTapNode } from './description-node.types';

/**
 * Context provided to all converters during conversion.
 */
export interface ConversionContext {
  website: string;
  shortcuts: Record<string, UsernameShortcut>;
  /** Maps website metadata name to the shortcut ID for that website */
  websiteToShortcutId?: Record<string, string>;
  customShortcuts: Map<string, TipTapNode[]>;
  defaultDescription: TipTapNode[];
  title?: string;
  tags?: string[];
  usernameConversions?: Map<string, string>;
  contentWarningText?: string;
}

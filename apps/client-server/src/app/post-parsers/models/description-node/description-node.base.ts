/* eslint-disable @typescript-eslint/no-explicit-any */
import { UsernameShortcut } from '@postybirb/types';
import { TipTapNode } from './description-node.types';

/**
 * Context provided to all converters during conversion.
 */
export interface ConversionContext {
  website: string;
  shortcuts: Record<string, UsernameShortcut>;
  customShortcuts: Map<string, TipTapNode[]>;
  defaultDescription: TipTapNode[];
  title?: string;
  tags?: string[];
  usernameConversions?: Map<string, string>;
  contentWarningText?: string;
}

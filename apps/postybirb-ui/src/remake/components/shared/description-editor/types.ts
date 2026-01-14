import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core';
import type { DefaultShortcut } from './custom-blocks/default-shortcut-block';
import type { InlineCustomShortcut } from './custom-blocks/inline-custom-shortcut';
import type { InlineUsernameShortcut } from './custom-blocks/inline-username-shortcut';

/**
 * Custom block specs including default shortcut block.
 */
export type CustomBlockSpecs = typeof defaultBlockSpecs & {
  defaultShortcut: ReturnType<typeof DefaultShortcut>;
};

/**
 * Custom inline content specs including custom and username shortcuts.
 */
export type CustomInlineContentSpecs = typeof defaultInlineContentSpecs & {
  customShortcut: typeof InlineCustomShortcut;
  username: typeof InlineUsernameShortcut;
};

/**
 * Custom style specs (using defaults).
 */
export type CustomStyleSpecs = typeof defaultStyleSpecs;

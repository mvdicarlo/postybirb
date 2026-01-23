/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServerBlockNoteEditor } from '@blocknote/server-util';
import { Description, ICustomShortcut } from '@postybirb/types';
import {
  LegacyConversionResult,
  LegacyConverterEntity,
} from './legacy-converter-entity';

export class LegacyCustomShortcut implements LegacyConverterEntity<ICustomShortcut> {
  _id: string;

  created: string;

  lastUpdated: string;

  shortcut: string;

  content: string;

  isDynamic: boolean;

  constructor(data: Partial<LegacyCustomShortcut>) {
    Object.assign(this, data);
  }

  async convert(): Promise<LegacyConversionResult<ICustomShortcut>> {
    // Convert legacy format to new format
    // Legacy: { shortcut: string, content: string, isDynamic: boolean }
    // New: { name: string, shortcut: Description (BlockNote format) }

    // Step 1: Wrap legacy shortcuts in code tags to preserve them during HTML parsing
    const contentWithWrappedShortcuts = this.wrapLegacyShortcuts(this.content);

    // Step 2: Parse HTML with wrapped shortcuts to BlockNote format
    // Lazy-load BlockNote to avoid ESM compatibility issues in Electron
    const editor = ServerBlockNoteEditor.create();
    let shortcut = (await editor.tryParseHTMLToBlocks(
      contentWithWrappedShortcuts,
    )) as unknown as Description;

    // Step 3: Convert legacy shortcuts to modern format
    shortcut = this.convertLegacyToModernShortcut(shortcut);

    // Step 4: Convert default shortcuts to block-level elements
    shortcut = this.convertDefaultToBlock(shortcut);

    return {
      entity: {
        // eslint-disable-next-line no-underscore-dangle
        id: this._id,
        name: this.shortcut, // Legacy shortcut name becomes the name
        shortcut,
      },
    };
  }

  /**
   * Recursively traverses BlockNote tree to find code blocks that are legacy shortcuts
   * and converts them to modern format in place.
   */
  private convertLegacyToModernShortcut(blocks: Description): Description {
    // Pattern matches:
    // {word} or {word:text} or {word[modifier]:text} or {word[modifier]}
    // Captures: (1) shortcut key, (2) optional modifier (ignored), (3) optional value
    const shortcutPattern =
      /^\{([a-zA-Z0-9]+)(?:\[([^\]]+)\])?(?::([^}]+))?\}$/;

    // Mapping of legacy system shortcuts to new inline shortcut types
    const systemShortcutMapping: Record<string, string> = {
      cw: 'contentWarningShortcut',
      title: 'titleShortcut',
      tags: 'tagsShortcut',
    };

    // Mapping of legacy username shortcut keys to modern IDs
    const usernameShortcutMapping: Record<string, string> = {
      ac: 'artconomy',
      bsky: 'bluesky',
      da: 'deviantart',
      db: 'derpibooru',
      e6: 'e621',
      fa: 'furaffinity',
      ft: 'furtastic',
      furb: 'furbooru',
      hf: 'h-foundry',
      ib: 'inkbunny',
      it: 'itaku',
      mb: 'manebooru',
      ng: 'newgrounds',
      pa: 'patreon',
      pf: 'pillowfort',
      ptv: 'picarto',
      pz: 'piczel',
      sf: 'sofurry',
      ss: 'subscribe-star',
      tu: 'tumblr',
      tw: 'twitter',
      ws: 'weasyl',
    };

    const processContent = (content: any[]): any[] => {
      const result: any[] = [];

      content.forEach((item: any) => {
        // Check if this is a code block
        if (
          item.type === 'text' &&
          item.styles?.code === true &&
          typeof item.text === 'string'
        ) {
          const match = item.text.match(shortcutPattern);

          if (match) {
            const shortcutKey = match[1];
            const shortcutKeyLower = shortcutKey.toLowerCase();

            // Check if this is a system shortcut (cw, title, tags)
            if (systemShortcutMapping[shortcutKeyLower]) {
              result.push({
                type: systemShortcutMapping[shortcutKeyLower],
                props: {},
              });
              return;
            }
            // match[2] is the modifier block - we ignore it
            const shortcutValue = match[3]; // Value is now in capture group 3

            // Check if this is a username shortcut (has a value after colon)
            if (shortcutValue) {
              const modernId =
                usernameShortcutMapping[shortcutKey.toLowerCase()];

              if (modernId) {
                // Convert to username shortcut format
                result.push({
                  type: 'username',
                  props: {
                    id: new Date().getTime().toString(),
                    shortcut: modernId,
                    only: '',
                  },
                  content: [{ type: 'text', text: shortcutValue, styles: {} }],
                });
                return;
              }

              // Has a colon but not a username shortcut - convert to customShortcut
              result.push({
                type: 'customShortcut',
                props: { id: shortcutKey },
                content: [{ type: 'text', text: shortcutValue, styles: {} }],
              });
              return;
            }

            // Simple shortcut without colon - convert to customShortcut
            result.push({
              type: 'customShortcut',
              props: { id: shortcutKey },
              content: [{ type: 'text', text: '', styles: {} }],
            });
            return;
          }

          // If it doesn't match shortcut pattern, return as is
          result.push(item);
          return;
        }

        result.push(item);
      });

      return result;
    };

    return blocks.map((block: any) => {
      // Process content array if it exists
      if (Array.isArray(block.content)) {
        // eslint-disable-next-line no-param-reassign
        block.content = processContent(block.content);
      }

      // Recursively process children blocks
      if (Array.isArray(block.children)) {
        // eslint-disable-next-line no-param-reassign
        block.children = this.convertLegacyToModernShortcut(block.children);
      }

      return block;
    }) as Description;
  }

  /**
   * Converts {default} shortcuts to block-level elements.
   * - If default is alone in a block, convert the block to type: 'defaultShortcut'
   * - If default is with other content, remove it and insert a defaultShortcut block before
   */
  private convertDefaultToBlock(blocks: Description): Description {
    const result: any[] = [];

    blocks.forEach((block: any) => {
      // First, recursively process children
      if (Array.isArray(block.children) && block.children.length > 0) {
        // eslint-disable-next-line no-param-reassign
        block.children = this.convertDefaultToBlock(block.children);
      }

      // Check if this block has content with a default customShortcut
      if (Array.isArray(block.content)) {
        const defaultShortcutIndex = block.content.findIndex(
          (item: any) =>
            item.type === 'customShortcut' && item.props?.id === 'default',
        );

        if (defaultShortcutIndex !== -1) {
          // Found a default shortcut in this block's content
          const otherContent = block.content.filter(
            (item: any, idx: number) => idx !== defaultShortcutIndex,
          );

          // Check if there are other content items (text, links, etc.)
          const hasOtherContent = otherContent.some((item: any) =>
            item.type === 'text'
              ? item.text.trim().length > 0
              : item.type !== 'customShortcut' || item.props?.id !== 'default',
          );

          if (hasOtherContent) {
            // Default was with other content - insert defaultShortcut block before this one
            result.push({
              type: 'defaultShortcut',
              props: {},
              content: [],
              children: [],
            });

            // Add the current block without the default shortcut
            result.push({
              ...block,
              content: otherContent,
            });
          } else {
            // Default was alone - convert this block to defaultShortcut type
            result.push({
              type: 'defaultShortcut',
              props: {},
              content: [],
              children: block.children || [],
            });
          }
          return;
        }
      }

      // No default shortcut found, keep block as is
      result.push(block);
    });

    return result as Description;
  }

  /**
   * Wraps legacy shortcuts in span tags to preserve them during HTML parsing.
   * Supports:
   * - Simple shortcuts: {default}, {customshortcut}
   * - Username shortcuts: {fa:username}, {tw:handle}
   * - Dynamic shortcuts: {myshortcut:text}
   * - Modifiers (stripped): {fa[only=furaffinity]:username}, {shortcut[modifier]}
   *
   * Ignores deprecated shortcuts: {cw}, {title}, {tags}
   *
   * Uses a special marker format that BlockNote will preserve in text content.
   * We use Unicode zero-width characters as markers that won't be visible but can be detected.
   */
  private wrapLegacyShortcuts(content: string): string {
    // Pattern matches:
    // {word} or {word:text} or {word[modifier]:text} or {word[modifier]}
    // where word is alphanumeric, modifier is anything except ], and text can contain anything except }
    const shortcutPattern = /\{([a-zA-Z0-9]+)(?:\[([^\]]+)\])?(?::([^}]+))?\}/g;

    return content.replace(
      shortcutPattern,
      (match, key, modifier, additionalText) =>
        // Use <code> tag which BlockNote preserves as inline code
        // This will create a separate text node with code styling that we can identify
        `<code data-shortcut="true">${match}</code>`,
    );
  }
}

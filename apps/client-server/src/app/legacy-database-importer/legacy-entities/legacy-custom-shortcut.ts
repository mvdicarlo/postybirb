/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import { Description, ICustomShortcut, TipTapNode } from '@postybirb/types';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Bold } from '@tiptap/extension-bold';
import { Code } from '@tiptap/extension-code';
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Heading } from '@tiptap/extension-heading';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';
import { Underline } from '@tiptap/extension-underline';
import { generateJSON } from '@tiptap/html/dist/server';
import {
    LegacyConverterEntity,
    MinimalEntity,
} from './legacy-converter-entity';

const tiptapExtensions = [
  Text,
  Document,
  Paragraph,
  Bold,
  Italic,
  Strike,
  Underline,
  Code,
  HardBreak,
  Blockquote,
  Heading,
  HorizontalRule,
  Link.configure({
    openOnClick: false,
  }),
];

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

  async convert(): Promise<MinimalEntity<ICustomShortcut>> {
    // Convert legacy format to new format
    // Legacy: { shortcut: string, content: string, isDynamic: boolean }
    // New: { name: string, shortcut: Description (TipTap format) }

    // Step 1: Wrap legacy shortcuts in code tags to preserve them during HTML parsing
    const contentWithWrappedShortcuts = this.wrapLegacyShortcuts(this.content);

    // Step 2: Parse HTML with wrapped shortcuts to TipTap JSON format
    const doc = generateJSON(
      contentWithWrappedShortcuts || '<p></p>',
      tiptapExtensions,
    ) as Description;

    // Step 3: Convert legacy shortcuts to modern format
    let blocks: TipTapNode[] = doc.content ?? [];
    blocks = this.convertLegacyToModernShortcut(blocks);

    // Step 4: Convert default shortcuts to block-level elements
    blocks = this.convertDefaultToBlock(blocks);

    const shortcut: Description = { type: 'doc', content: blocks };

    return {
      // eslint-disable-next-line no-underscore-dangle
      id: this._id,
      name: this.shortcut, // Legacy shortcut name becomes the name
      shortcut,
    };
  }

  /**
   * Recursively traverses TipTap tree to find code-marked text nodes that are
   * legacy shortcuts and converts them to modern format in place.
   */
  private convertLegacyToModernShortcut(blocks: TipTapNode[]): TipTapNode[] {
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

    const hasCodeMark = (item: any): boolean =>
      Array.isArray(item.marks) &&
      item.marks.some((m: any) => m.type === 'code');

    const processInlineContent = (content: any[]): any[] => {
      const result: any[] = [];

      content.forEach((item: any) => {
        // Check if this is a code-marked text node (legacy shortcut)
        if (
          item.type === 'text' &&
          hasCodeMark(item) &&
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
                attrs: {},
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
                  attrs: {
                    shortcut: modernId,
                    only: '',
                    username: shortcutValue,
                  },
                });
                return;
              }

              // Has a colon but not a username shortcut - convert to customShortcut
              result.push({
                type: 'customShortcut',
                attrs: { id: shortcutKey },
                content: [{ type: 'text', text: shortcutValue }],
              });
              return;
            }

            // Simple shortcut without colon - convert to customShortcut
            result.push({
              type: 'customShortcut',
              attrs: { id: shortcutKey },
              content: [{ type: 'text', text: '' }],
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
      if (!Array.isArray(block.content)) {
        return block;
      }

      // Check if content contains inline nodes (text) or block nodes (paragraph, etc.)
      const hasInlineContent = block.content.some(
        (c: any) => c.type === 'text',
      );

      if (hasInlineContent) {
        // Process inline content for shortcut conversion
        // eslint-disable-next-line no-param-reassign
        block.content = processInlineContent(block.content);
      } else {
        // Recursively process nested block content (e.g. blockquote > paragraph)
        // eslint-disable-next-line no-param-reassign
        block.content = this.convertLegacyToModernShortcut(block.content);
      }

      return block;
    });
  }

  /**
   * Converts {default} shortcuts to block-level elements.
   * - If default is alone in a block, convert the block to type: 'defaultShortcut'
   * - If default is with other content, remove it and insert a defaultShortcut block before
   */
  private convertDefaultToBlock(blocks: TipTapNode[]): TipTapNode[] {
    const result: any[] = [];

    blocks.forEach((block: any) => {
      // Recursively process nested block content (e.g. blockquote)
      if (
        Array.isArray(block.content) &&
        !block.content.some((c: any) => c.type === 'text')
      ) {
        // eslint-disable-next-line no-param-reassign
        block.content = this.convertDefaultToBlock(block.content);
      }

      // Check if this block has content with a default customShortcut
      if (Array.isArray(block.content)) {
        const defaultShortcutIndex = block.content.findIndex(
          (item: any) =>
            item.type === 'customShortcut' && item.attrs?.id === 'default',
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
              : item.type !== 'customShortcut' || item.attrs?.id !== 'default',
          );

          if (hasOtherContent) {
            // Default was with other content - insert defaultShortcut block before this one
            result.push({
              type: 'defaultShortcut',
              attrs: {},
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
              attrs: {},
            });
          }
          return;
        }
      }

      // No default shortcut found, keep block as is
      result.push(block);
    });

    return result;
  }

  /**
   * Wraps legacy shortcuts in code tags to preserve them during HTML parsing.
   * Supports:
   * - Simple shortcuts: {default}, {customshortcut}
   * - Username shortcuts: {fa:username}, {tw:handle}
   * - Dynamic shortcuts: {myshortcut:text}
   * - Modifiers (stripped): {fa[only=furaffinity]:username}, {shortcut[modifier]}
   *
   * Ignores deprecated shortcuts: {cw}, {title}, {tags}
   *
   * Uses <code> tags to mark shortcuts so TipTap will preserve them as
   * code-marked text nodes that can be detected and converted.
   */
  private wrapLegacyShortcuts(content: string): string {
    // Pattern matches:
    // {word} or {word:text} or {word[modifier]:text} or {word[modifier]}
    // where word is alphanumeric, modifier is anything except ], and text can contain anything except }
    const shortcutPattern = /\{([a-zA-Z0-9]+)(?:\[([^\]]+)\])?(?::([^}]+))?\}/g;

    return content.replace(
      shortcutPattern,
      (match, key, modifier, additionalText) =>
        // Use <code> tag which TipTap preserves as a code mark on text nodes
        // This will create a text node with a code mark that we can identify
        `<code data-shortcut="true">${match}</code>`,
    );
  }
}

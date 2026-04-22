/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import { Description, TipTapNode } from '@postybirb/types';
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

/**
 * Pattern to match legacy shortcuts in HTML content.
 * Matches: {word}, {word:text}, {word[modifier]:text}, {word[modifier]}
 */
const SHORTCUT_WRAP_PATTERN =
  /\{([a-zA-Z0-9]+)(?:\[([^\]]+)\])?(?::([^}]+))?\}/g;

/**
 * Pattern for matching a single shortcut (anchored).
 * Captures: (1) shortcut key, (2) optional modifier, (3) optional value
 */
const SHORTCUT_MATCH_PATTERN =
  /^\{([a-zA-Z0-9]+)(?:\[([^\]]+)\])?(?::([^}]+))?\}$/;

/** Mapping of legacy system shortcuts to modern inline shortcut node types. */
const SYSTEM_SHORTCUT_MAP: Record<string, string> = {
  cw: 'contentWarningShortcut',
  title: 'titleShortcut',
  tags: 'tagsShortcut',
};

/** Mapping of legacy username shortcut keys to modern website IDs. */
const USERNAME_SHORTCUT_MAP: Record<string, string> = {
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

/**
 * Shared utility for converting legacy HTML content (with optional legacy shortcuts)
 * to TipTap JSON Description format.
 *
 * Used by both the LegacyCustomShortcut converter and the submission-part transformers.
 *
 * Conversion pipeline:
 * 1. Wrap legacy shortcuts `{...}` in `<code>` tags to preserve them during HTML parsing
 * 2. Parse HTML to TipTap JSON using `generateJSON()` with standard extensions
 * 3. Convert code-marked shortcut text nodes to proper modern shortcut node types
 * 4. Convert `{default}` shortcuts to block-level `defaultShortcut` nodes
 */
export class LegacyDescriptionConverter {
  /**
   * Convert an HTML string (with optional legacy shortcuts) to a TipTap Description.
   */
  static convert(html: string): Description {
    // Step 1: Wrap shortcuts in <code> tags to preserve during HTML parsing
    const wrappedHtml = LegacyDescriptionConverter.wrapLegacyShortcuts(html);

    // Step 2: Parse HTML to TipTap JSON
    const doc = generateJSON(
      wrappedHtml || '<p></p>',
      tiptapExtensions,
    ) as Description;

    // Step 3: Convert legacy shortcuts to modern node types
    let blocks: TipTapNode[] = doc.content ?? [];
    blocks = LegacyDescriptionConverter.convertShortcuts(blocks);

    // Step 4: Convert {default} to block-level elements
    blocks = LegacyDescriptionConverter.convertDefaultToBlock(blocks);

    return { type: 'doc', content: blocks };
  }

  /**
   * Wraps legacy shortcuts in `<code>` tags so TipTap preserves them
   * as code-marked text nodes that can be detected and converted.
   */
  static wrapLegacyShortcuts(content: string): string {
    return content.replace(
      SHORTCUT_WRAP_PATTERN,
      (match) => `<code data-shortcut="true">${match}</code>`,
    );
  }

  /**
   * Recursively traverses TipTap node tree to find code-marked text nodes
   * that are legacy shortcuts and converts them to modern shortcut node types.
   */
  static convertShortcuts(blocks: TipTapNode[]): TipTapNode[] {
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
          const match = item.text.match(SHORTCUT_MATCH_PATTERN);

          if (match) {
            const shortcutKey = match[1];
            const shortcutKeyLower = shortcutKey.toLowerCase();

            // System shortcuts: {cw}, {title}, {tags}
            if (SYSTEM_SHORTCUT_MAP[shortcutKeyLower]) {
              result.push({
                type: SYSTEM_SHORTCUT_MAP[shortcutKeyLower],
                attrs: {},
              });
              return;
            }

            // match[2] is the modifier block - we ignore it
            const shortcutValue = match[3]; // Value after colon

            // Username shortcuts: {fa:username}, {tw:handle}, etc.
            if (shortcutValue) {
              const modernId = USERNAME_SHORTCUT_MAP[shortcutKeyLower];

              if (modernId) {
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

              // Has a colon but not a username shortcut → customShortcut
              result.push({
                type: 'customShortcut',
                attrs: { id: shortcutKey },
                content: [{ type: 'text', text: shortcutValue }],
              });
              return;
            }

            // Simple shortcut without colon → customShortcut
            result.push({
              type: 'customShortcut',
              attrs: { id: shortcutKey },
              content: [{ type: 'text', text: '' }],
            });
            return;
          }

          // Doesn't match shortcut pattern, keep as-is
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

      const hasInlineContent = block.content.some(
        (c: any) => c.type === 'text',
      );

      if (hasInlineContent) {
        block.content = processInlineContent(block.content);
      } else {
        // Recursively process nested block content (e.g. blockquote > paragraph)
        block.content = LegacyDescriptionConverter.convertShortcuts(
          block.content,
        );
      }

      return block;
    });
  }

  /**
   * Converts `{default}` customShortcut nodes to block-level `defaultShortcut` nodes.
   * - If default is alone in a block, convert the block to `defaultShortcut`
   * - If default is with other content, insert a `defaultShortcut` block before
   */
  static convertDefaultToBlock(blocks: TipTapNode[]): TipTapNode[] {
    const result: any[] = [];

    blocks.forEach((block: any) => {
      // Recursively process nested block content (e.g. blockquote)
      if (
        Array.isArray(block.content) &&
        !block.content.some((c: any) => c.type === 'text')
      ) {
        block.content = LegacyDescriptionConverter.convertDefaultToBlock(
          block.content,
        );
      }

      // Check if this block has content with a default customShortcut
      if (Array.isArray(block.content)) {
        const defaultShortcutIndex = block.content.findIndex(
          (item: any) =>
            item.type === 'customShortcut' && item.attrs?.id === 'default',
        );

        if (defaultShortcutIndex !== -1) {
          const otherContent = block.content.filter(
            (_item: any, idx: number) => idx !== defaultShortcutIndex,
          );

          const hasOtherContent = otherContent.some((item: any) =>
            item.type === 'text'
              ? item.text.trim().length > 0
              : item.type !== 'customShortcut' || item.attrs?.id !== 'default',
          );

          if (hasOtherContent) {
            // Default was with other content — insert defaultShortcut block before
            result.push({ type: 'defaultShortcut', attrs: {} });
            result.push({ ...block, content: otherContent });
          } else {
            // Default was alone — convert block to defaultShortcut
            result.push({ type: 'defaultShortcut', attrs: {} });
          }
          return;
        }
      }

      // No default shortcut found, keep as-is
      result.push(block);
    });

    return result;
  }
}

/* eslint-disable import/no-extraneous-dependencies */
import { Node } from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Bold } from '@tiptap/extension-bold';
import { Color } from '@tiptap/extension-color';
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Heading } from '@tiptap/extension-heading';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { generateJSON } from '@tiptap/html/dist/server';

/**
 * Custom Paragraph extension for Patreon that includes
 * nodeIndent, nodeTextAlignment, nodeLineHeight, and style attrs.
 */
const PatreonParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      nodeIndent: { default: null },
      nodeTextAlignment: { default: null },
      nodeLineHeight: { default: null },
      style: { default: '' },
    };
  },
});

/**
 * Custom paywallBreakpoint node used by Patreon's editor schema.
 */
const PaywallBreakpoint = Node.create({
  name: 'paywallBreakpoint',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      paywallBreakpointCtaProps: { default: {} },
    };
  },

  renderHTML() {
    return ['div', { 'data-type': 'paywallBreakpoint' }];
  },

  parseHTML() {
    return [{ tag: 'div[data-type="paywallBreakpoint"]' }];
  },
});

const extensions = [
  Text,
  Document,
  PatreonParagraph,
  Bold,
  Italic,
  Strike,
  Underline,
  HardBreak,
  Blockquote,
  Color,
  TextStyle,
  Heading,
  HorizontalRule,
  Link,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  PaywallBreakpoint,
];

export interface PatreonContentOptions {
  postId: string;
  isMonetized: boolean;
  isPaidAccessSelected: boolean;
  includePaywall: boolean;
  currencyCode?: string;
}

export class PatreonDescriptionConverter {
  /**
   * Converts HTML content into a Patreon-compatible TipTap JSON string,
   * optionally prepending a paywallBreakpoint node.
   */
  static convert(html: string, options: PatreonContentOptions): string {
    const doc = generateJSON(html || '<p></p>', extensions);

    if (options.includePaywall) {
      // Prepend the paywallBreakpoint node to the document content
      const paywallNode = {
        type: 'paywallBreakpoint',
        attrs: {
          paywallBreakpointCtaProps: {
            currencyCode: options.currencyCode ?? 'USD',
            isMonetized: options.isMonetized,
            isPaidAccessSelected: options.isPaidAccessSelected,
            isPaidMembersSelected: options.isPaidAccessSelected,
            showCtas: false,
            postId: options.postId,
          },
        },
      };

      doc.content = [paywallNode, ...(doc.content ?? [])];
    }

    return JSON.stringify(doc);
  }
}

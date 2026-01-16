/* eslint-disable import/no-extraneous-dependencies */
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

const extensions = [
  Text,
  Document,
  Paragraph,
  Bold,
  Italic,
  Strike,
  Underline,
  HardBreak,
  Blockquote,
  Color,
  TextStyle,
  Heading,
  HorizontalRule.configure({
    HTMLAttributes: {
      'data-ruler': '1',
    },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    protocols: ['https', 'http', 'mailto'],
    validate(url) {
      return /^(#|http|mailto)/.test(url);
    },
    HTMLAttributes: {
      rel: 'noopener noreferrer nofollow ugc',
      target: '_blank',
    },
  }),
  TextAlign.extend({
    name: 'da-text-align',
    addCommands() {
      const parentCommands = this.parent?.();
      return {
        unsetTextAlign: parentCommands?.unsetTextAlign,
        setTextAlign: (alignment) => (object) => {
          if (!parentCommands || !parentCommands.setTextAlign) {
            return false;
          }
          return parentCommands.setTextAlign(alignment)(object);
        },
      };
    },
  }).configure({
    types: ['heading', 'paragraph'],
  }),
];

export class DeviantArtDescriptionConverter {
  static convert(html: string): string {
    const document = generateJSON(html || '<div></div>', extensions);
    return JSON.stringify({
      version: 1,
      document,
    });
  }
}

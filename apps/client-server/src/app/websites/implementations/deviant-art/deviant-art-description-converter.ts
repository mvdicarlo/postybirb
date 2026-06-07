/* eslint-disable import/no-extraneous-dependencies */
import { TipTapNode } from '@postybirb/types';
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
import { generateHTML, generateJSON } from '@tiptap/html/server';
import { HtmlConverter } from '../../../post-parsers/models/description-node/converters/html-converter';
import { ConversionContext } from '../../../post-parsers/models/description-node/description-node.base';

const extensions = [
  Text,
  Document,

  // PostyBirb editor produces divs with align instead of paragaphs, so we need to specify it in order to parse it
  Paragraph.extend({
    parseHTML() {
      return [{ tag: 'p' }, { tag: 'div' }];
    },
  }),

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
  TextAlign.configure({
    types: ['heading', 'paragraph', 'divBlock'],
  }),
];

export class DeviantArtDescriptionConverter extends HtmlConverter {
  static getDocument(description: string) {
    return JSON.stringify(
      (JSON.parse(description) as { description: string }).description,
    );
  }

  static htmlToJson(html: string) {
    return generateJSON(html || '<div></div>', extensions);
  }

  convert(nodes: TipTapNode[], context: ConversionContext): string {
    const html = super.convert(nodes, context);

    const document = DeviantArtDescriptionConverter.htmlToJson(html);
    return JSON.stringify({
      raw: html,
      rendered: generateHTML(document, extensions),
      description: {
        version: 1,
        document,
      },
    });
  }
}

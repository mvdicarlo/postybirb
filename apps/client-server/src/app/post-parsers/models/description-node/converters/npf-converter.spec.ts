import { TipTapNode } from '@postybirb/types';
import { ConversionContext } from '../description-node.base';
import { NpfConverter, NPFTextBlock } from './npf-converter';

describe('NpfConverter', () => {
  let converter: NpfConverter;
  let context: ConversionContext;

  beforeEach(() => {
    converter = new NpfConverter();
    context = {
      website: 'tumblr',
      shortcuts: {},
      customShortcuts: new Map(),
      defaultDescription: [],
    };
  });

  describe('convertBlockNode', () => {
    it('should convert a simple paragraph to NPF text block', () => {
      const node: TipTapNode = {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Hello, World!',
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson);

      expect(result).toEqual({
        type: 'text',
        text: 'Hello, World!',
      });
    });

    it('should convert a paragraph with bold text to NPF with formatting', () => {
      const node: TipTapNode = {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This is ',
          },
          {
            type: 'text',
            text: 'bold',
            marks: [{ type: 'bold' }],
          },
          {
            type: 'text',
            text: ' text',
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson) as NPFTextBlock;

      expect(result.type).toBe('text');
      expect(result.text).toBe('This is bold text');
      expect(result.formatting).toEqual([
        {
          start: 8,
          end: 12,
          type: 'bold',
        },
      ]);
    });

    it('should convert a paragraph with link mark to NPF with link formatting', () => {
      const node: TipTapNode = {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Visit ',
          },
          {
            type: 'text',
            text: 'PostyBirb',
            marks: [
              {
                type: 'link',
                attrs: { href: 'https://postybirb.com' },
              },
            ],
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson) as NPFTextBlock;

      expect(result.type).toBe('text');
      expect(result.text).toBe('Visit PostyBirb');
      expect(result.formatting).toEqual([
        {
          start: 6,
          end: 15,
          type: 'link',
          url: 'https://postybirb.com',
        },
      ]);
    });

    it('should convert heading to NPF text block with subtype', () => {
      const node: TipTapNode = {
        type: 'heading',
        attrs: { level: 1 },
        content: [
          {
            type: 'text',
            text: 'My Heading',
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson);

      expect(result).toEqual({
        type: 'text',
        text: 'My Heading',
        subtype: 'heading1',
      });
    });

    it('should convert image to NPF image block', () => {
      const node: TipTapNode = {
        type: 'image',
        attrs: {
          src: 'https://example.com/image.jpg',
          alt: 'My Image',
          width: 800,
          height: 600,
        },
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson);

      expect(result).toEqual({
        type: 'image',
        media: [
          {
            url: 'https://example.com/image.jpg',
            type: 'image/jpeg',
            width: 800,
            height: 600,
          },
        ],
        alt_text: 'My Image',
      });
    });

    it('should handle multiple formatting types on same text', () => {
      const node: TipTapNode = {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Bold and Italic',
            marks: [{ type: 'bold' }, { type: 'italic' }],
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson) as NPFTextBlock;

      expect(result.type).toBe('text');
      expect(result.text).toBe('Bold and Italic');
      expect(result.formatting).toEqual([
        {
          start: 0,
          end: 15,
          type: 'bold',
        },
        {
          start: 0,
          end: 15,
          type: 'italic',
        },
      ]);
    });

    it('should handle custom shortcuts', () => {
      const shortcutContent: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Commission Info',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ];

      context.customShortcuts.set('cs-1', shortcutContent);

      const node: TipTapNode = {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Check out my ',
          },
          {
            type: 'customShortcut',
            attrs: { id: 'cs-1' },
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node, context);
      const result = JSON.parse(resultJson) as NPFTextBlock;

      expect(result.type).toBe('text');
      expect(result.text).toBe('Check out my Commission Info');
      expect(result.formatting).toEqual([
        {
          start: 13,
          end: 28,
          type: 'bold',
        },
      ]);
    });
  });
});

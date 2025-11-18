import { ConversionContext } from '../description-node.base';
import { IDescriptionBlockNode } from '../description-node.types';
import { NpfConverter, NPFTextBlock, NPFContentBlock } from './npf-converter';

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
      const node: IDescriptionBlockNode = {
        id: 'test-1',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'Hello, World!',
            styles: {},
            props: {},
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
      const result = JSON.parse(resultJson);

      expect(result).toEqual({
        type: 'text',
        text: 'Hello, World!',
      });
    });

    it('should convert a paragraph with bold text to NPF with formatting', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-2',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'This is ',
            styles: {},
            props: {},
          },
          {
            type: 'text',
            text: 'bold',
            styles: { bold: true },
            props: {},
          },
          {
            type: 'text',
            text: ' text',
            styles: {},
            props: {},
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
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

    it('should convert a paragraph with link to NPF with link formatting', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-3',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'Visit ',
            styles: {},
            props: {},
          },
          {
            type: 'link',
            href: 'https://postybirb.com',
            props: {},
            content: [
              {
                type: 'text',
                text: 'PostyBirb',
                styles: {},
                props: {},
              },
            ],
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
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
      const node: IDescriptionBlockNode = {
        id: 'test-4',
        type: 'heading',
        props: { level: '1' },
        content: [
          {
            type: 'text',
            text: 'My Heading',
            styles: {},
            props: {},
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
      const result = JSON.parse(resultJson);

      expect(result).toEqual({
        type: 'text',
        text: 'My Heading',
        subtype: 'heading1',
      });
    });

    it('should convert image to NPF image block', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-5',
        type: 'image',
        props: {
          url: 'https://example.com/image.jpg',
          name: 'My Image',
          previewWidth: '800',
          previewHeight: '600',
        },
        content: [],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
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
      const node: IDescriptionBlockNode = {
        id: 'test-6',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'Bold and Italic',
            styles: { bold: true, italic: true },
            props: {},
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
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
      const shortcutContent: IDescriptionBlockNode[] = [
        {
          id: 'shortcut-1',
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'text',
              text: 'Commission Info',
              styles: { bold: true },
              props: {},
            },
          ],
        },
      ];

      context.customShortcuts.set('cs-1', shortcutContent);

      const node: IDescriptionBlockNode = {
        id: 'test-7',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'Check out my ',
            styles: {},
            props: {},
          },
          {
            type: 'customShortcut',
            props: { id: 'cs-1' },
            content: [],
          },
        ],
      };

      const resultJson = converter.convertBlockNode(node as any, context);
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

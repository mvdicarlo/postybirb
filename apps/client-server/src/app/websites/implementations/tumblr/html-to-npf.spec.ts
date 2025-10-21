import { UsernameShortcut } from '@postybirb/types';
import { DescriptionBlockNode } from '../../../post-parsers/models/description-node/block-description-node';
import { IDescriptionBlockNode } from '../../../post-parsers/models/description-node/description-node.types';
import { HtmlToNpfConverter } from './html-to-npf';

describe('HtmlToNpfConverter', () => {
  let converter: HtmlToNpfConverter;
  const shortcuts: Record<string, UsernameShortcut> = {};

  beforeEach(() => {
    converter = new HtmlToNpfConverter();
  });

  describe('convert', () => {
    it('should convert a simple paragraph to NPF text block', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-1',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'Hello, World!',
            styles: {},
            props: {},
          },
        ],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'text',
          text: 'Hello, World!',
        },
      ]);
    });

    it('should convert paragraph with bold text to NPF with formatting', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-2',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'Hello, ',
            styles: { bold: true },
            props: {},
          },
          {
            type: 'text',
            text: 'World!',
            styles: {},
            props: {},
          },
        ],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'text',
          text: 'Hello, World!',
          formatting: [
            {
              start: 0,
              end: 7,
              type: 'bold',
            },
          ],
        },
      ]);
    });

    it('should convert paragraph with link to NPF with link formatting', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-3',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
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
            content: [
              {
                type: 'text',
                text: 'PostyBirb',
                styles: {},
                props: {},
              },
            ],
            props: {},
          },
        ],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'text',
          text: 'Visit PostyBirb',
          formatting: [
            {
              start: 6,
              end: 15,
              type: 'link',
              url: 'https://postybirb.com',
            },
          ],
        },
      ]);
    });

    it('should convert heading to NPF text block with subtype', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-4',
        type: 'heading',
        props: {
          level: '1',
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'Main Title',
            styles: {},
            props: {},
          },
        ],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'text',
          text: 'Main Title',
          subtype: 'heading1',
        },
      ]);
    });

    it('should convert image to NPF image block', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-5',
        type: 'image',
        props: {
          url: 'https://example.com/image.jpg',
          name: 'Test Image',
          caption: 'A test image',
          previewWidth: '800',
          previewHeight: '600',
        },
        content: [],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'image',
          media: [
            {
              url: 'https://example.com/image.jpg',
              type: 'image/jpeg',
              width: 800,
              height: 600,
            },
          ],
          alt_text: 'Test Image',
          caption: 'A test image',
        },
      ]);
    });

    it('should convert multiple formatting styles', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-6',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'Bold and italic',
            styles: { bold: true, italic: true },
            props: {},
          },
        ],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'text',
          text: 'Bold and italic',
          formatting: [
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
          ],
        },
      ]);
    });

    it('should handle video blocks', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-7',
        type: 'video',
        props: {
          url: 'https://example.com/video.mp4',
          caption: 'Test video',
          previewWidth: '1920',
          previewHeight: '1080',
        },
        content: [],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'video',
        provider: 'tumblr',
        url: 'https://example.com/video.mp4',
        media: {
          url: 'https://example.com/video.mp4',
          type: 'video/mp4',
          width: 1920,
          height: 1080,
        },
      });
      expect(result[1]).toEqual({
        type: 'text',
        text: 'Test video',
      });
    });

    it('should handle strikethrough formatting', () => {
      const node: IDescriptionBlockNode = {
        id: 'test-8',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'This is strikethrough',
            styles: { strike: true },
            props: {},
          },
        ],
      };

      const blockNode = new DescriptionBlockNode('tumblr', node, shortcuts);
      const result = converter.convert(blockNode);

      expect(result).toEqual([
        {
          type: 'text',
          text: 'This is strikethrough',
          formatting: [
            {
              start: 0,
              end: 21,
              type: 'strikethrough',
            },
          ],
        },
      ]);
    });
  });
});


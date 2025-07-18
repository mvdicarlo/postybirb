import { Description } from '@postybirb/types';
import { DescriptionNodeTree } from './description-node/description-node-tree';
import { IDescriptionBlockNode } from './description-node/description-node.types';

describe('DescriptionNode', () => {
  it('should support username shortcuts', () => {
    const shortcutDescription: Description = [
      {
        id: 'test-basic-text',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          { type: 'text', text: 'Hello, ', styles: { bold: true } },
          {
            type: 'username',
            props: {
              id: '1740142676292',
              shortcut: 'test',
              only: '',
            },
            content: [
              {
                type: 'text',
                text: 'User',
                styles: {},
              },
            ],
          },
        ],
        children: [],
      },
    ];

    const tree = new DescriptionNodeTree(
      'test',
      shortcutDescription as unknown as Array<IDescriptionBlockNode>,
      {
        insertAd: false,
      },
      {
        test: {
          id: 'test',
          url: 'https://test.postybirb.com/$1',
        },
      },
      {},
    );

    expect(tree.toPlainText()).toBe('Hello, https://test.postybirb.com/User');
    expect(tree.toHtml()).toBe(
      '<div><span><b>Hello, </b></span><a target="_blank" href="https://test.postybirb.com/User">User</a></div>',
    );
    expect(tree.toBBCode()).toBe(
      '[b]Hello, [/b][url=https://test.postybirb.com/User]User[/url]',
    );
  });

  it('should support username shortcut conversion', () => {
    const shortcutDescription: Description = [
      {
        id: 'test-basic-text',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          { type: 'text', text: 'Hello, ', styles: { bold: true } },
          {
            type: 'username',
            props: {
              id: '1740142676292',
              shortcut: 'test',
              only: '',
            },
            content: [
              {
                type: 'text',
                text: 'User',
                styles: {},
              },
            ],
          },
        ],
        children: [],
      },
    ];

    const tree = new DescriptionNodeTree(
      'test',
      shortcutDescription as unknown as Array<IDescriptionBlockNode>,
      {
        insertAd: false,
      },
      {
        test: {
          id: 'test',
          url: 'https://test.postybirb.com/$1',
          convert: (websiteName) => {
            if (websiteName === 'test') {
              return '<!~$1>';
            }
            return undefined;
          },
        },
      },
      {},
    );

    expect(tree.toPlainText()).toBe('Hello, <!~User>');
    expect(tree.toHtml()).toBe(
      '<div><span><b>Hello, </b></span><span><!~User></span></div>',
    );
    expect(tree.toBBCode()).toBe('[b]Hello, [/b]<!~User>');
  });

  it('should handle multiple paragraphs', () => {
    const multiParagraphDescription: Description = [
      {
        id: 'test-multi-paragraph',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: 'First paragraph.', styles: {} }],
        children: [],
      },
      {
        id: 'test-multi-paragraph-2',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: 'Second paragraph.', styles: {} }],
        children: [],
      },
    ];

    const tree = new DescriptionNodeTree(
      'test',
      multiParagraphDescription as unknown as Array<IDescriptionBlockNode>,
      {
        insertAd: false,
      },
      {},
      {},
    );

    expect(tree.toPlainText()).toBe('First paragraph.\r\nSecond paragraph.');
    expect(tree.toHtml()).toBe(
      '<div>First paragraph.</div><div>Second paragraph.</div>',
    );
    expect(tree.toBBCode()).toBe(
      'First paragraph.\nSecond paragraph.',
    );
  });
});

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
  });
});

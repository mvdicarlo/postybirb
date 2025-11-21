import { Description } from '@postybirb/types';
import { DescriptionNodeTree } from './description-node/description-node-tree';
import { ConversionContext } from './description-node/description-node.base';
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

    const context: ConversionContext = {
      website: 'test',
      shortcuts: {
        test: {
          id: 'test',
          url: 'https://test.postybirb.com/$1',
        },
      },
      customShortcuts: new Map(),
      defaultDescription: [],
    };

    const tree = new DescriptionNodeTree(
      context,
      shortcutDescription as unknown as Array<IDescriptionBlockNode>,
      {
        insertAd: false,
      },
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

    const context: ConversionContext = {
      website: 'test',
      shortcuts: {
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
      customShortcuts: new Map(),
      defaultDescription: [],
    };

    const tree = new DescriptionNodeTree(
      context,
      shortcutDescription as unknown as Array<IDescriptionBlockNode>,
      {
        insertAd: false,
      },
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

    const context: ConversionContext = {
      website: 'test',
      shortcuts: {},
      customShortcuts: new Map(),
      defaultDescription: [],
    };

    const tree = new DescriptionNodeTree(
      context,
      multiParagraphDescription as unknown as Array<IDescriptionBlockNode>,
      {
        insertAd: false,
      },
    );

    expect(tree.toPlainText()).toBe('First paragraph.\r\nSecond paragraph.');
    expect(tree.toHtml()).toBe(
      '<div>First paragraph.</div><div>Second paragraph.</div>',
    );
    expect(tree.toBBCode()).toBe('First paragraph.\nSecond paragraph.');
  });

  describe('findUsernames', () => {
    it('should find all usernames in the tree', () => {
      const description: Description = [
        {
          id: 'test-usernames',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Hello ', styles: {} },
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
                  text: 'User1',
                  styles: {},
                },
              ],
            },
            { type: 'text', text: ' and ', styles: {} },
            {
              type: 'username',
              props: {
                id: '1740142676293',
                shortcut: 'test',
                only: '',
              },
              content: [
                {
                  type: 'text',
                  text: 'User2',
                  styles: {},
                },
              ],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(2);
      expect(usernames.has('User1')).toBe(true);
      expect(usernames.has('User2')).toBe(true);
    });

    it('should find usernames across multiple paragraphs', () => {
      const description: Description = [
        {
          id: 'para1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '1', shortcut: 'test', only: '' },
              content: [{ type: 'text', text: 'Alice', styles: {} }],
            },
          ],
          children: [],
        },
        {
          id: 'para2',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '2', shortcut: 'test', only: '' },
              content: [{ type: 'text', text: 'Bob', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(2);
      expect(usernames.has('Alice')).toBe(true);
      expect(usernames.has('Bob')).toBe(true);
    });

    it('should return empty set when no usernames exist', () => {
      const description: Description = [
        {
          id: 'test-no-usernames',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Just plain text', styles: {} }],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(0);
    });

    it('should handle duplicate usernames', () => {
      const description: Description = [
        {
          id: 'test-duplicates',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '1', shortcut: 'test', only: '' },
              content: [{ type: 'text', text: 'SameUser', styles: {} }],
            },
            { type: 'text', text: ' and ', styles: {} },
            {
              type: 'username',
              props: { id: '2', shortcut: 'test', only: '' },
              content: [{ type: 'text', text: 'SameUser', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(1);
      expect(usernames.has('SameUser')).toBe(true);
    });
  });

  describe('findCustomShortcutIds', () => {
    it('should find all custom shortcut IDs in the tree', () => {
      const description: Description = [
        {
          id: 'test-shortcuts',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Here are some shortcuts: ', styles: {} },
            {
              type: 'customShortcut',
              props: { id: 'shortcut-1' },
              content: [{ type: 'text', text: 'Shortcut 1', styles: {} }],
            },
            { type: 'text', text: ' and ', styles: {} },
            {
              type: 'customShortcut',
              props: { id: 'shortcut-2' },
              content: [{ type: 'text', text: 'Shortcut 2', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(2);
      expect(shortcutIds.has('shortcut-1')).toBe(true);
      expect(shortcutIds.has('shortcut-2')).toBe(true);
    });

    it('should find shortcuts across multiple paragraphs', () => {
      const description: Description = [
        {
          id: 'para1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'customShortcut',
              props: { id: 'shortcut-a' },
              content: [{ type: 'text', text: 'A', styles: {} }],
            },
          ],
          children: [],
        },
        {
          id: 'para2',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'customShortcut',
              props: { id: 'shortcut-b' },
              content: [{ type: 'text', text: 'B', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(2);
      expect(shortcutIds.has('shortcut-a')).toBe(true);
      expect(shortcutIds.has('shortcut-b')).toBe(true);
    });

    it('should return empty set when no custom shortcuts exist', () => {
      const description: Description = [
        {
          id: 'test-no-shortcuts',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Just plain text', styles: {} }],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(0);
    });

    it('should handle duplicate shortcut IDs', () => {
      const description: Description = [
        {
          id: 'test-duplicates',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'customShortcut',
              props: { id: 'same-id' },
              content: [{ type: 'text', text: 'First', styles: {} }],
            },
            { type: 'text', text: ' and ', styles: {} },
            {
              type: 'customShortcut',
              props: { id: 'same-id' },
              content: [{ type: 'text', text: 'Second', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(1);
      expect(shortcutIds.has('same-id')).toBe(true);
    });

    it('should handle shortcuts without IDs gracefully', () => {
      const description: Description = [
        {
          id: 'test-no-id',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'customShortcut',
              props: { id: '' },
              content: [{ type: 'text', text: 'No ID', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(0);
    });
  });

  describe('updateContext', () => {
    it('should allow updating context after tree creation', () => {
      const description: Description = [
        {
          id: 'test-update',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '1', shortcut: 'test', only: '' },
              content: [{ type: 'text', text: 'TestUser', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {
          test: {
            id: 'test',
            url: 'https://test.postybirb.com/$1',
          },
        },
        customShortcuts: new Map(),
        defaultDescription: [],
        usernameConversions: new Map(),
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      // Before update - no conversion
      expect(tree.toPlainText()).toBe('https://test.postybirb.com/TestUser');

      // Update context with username conversion
      tree.updateContext({
        usernameConversions: new Map([['TestUser', 'ConvertedUser']]),
      });

      // After update - should use converted username
      expect(tree.toPlainText()).toBe(
        'https://test.postybirb.com/ConvertedUser',
      );

      // Verify the tree still finds the original username
      const usernames = tree.findUsernames();
      expect(usernames.has('TestUser')).toBe(true);
    });
  });
});

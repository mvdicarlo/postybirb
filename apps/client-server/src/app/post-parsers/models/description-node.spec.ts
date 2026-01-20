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

  describe('nested children blocks', () => {
    it('should render nested children with proper indentation in HTML', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 1', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Para 1 nested', styles: {} }],
              children: [],
            },
          ],
        },
        {
          id: 'parent-2',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 2', styles: {} }],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // HTML should wrap children in a div with margin-left
      expect(tree.toHtml()).toBe(
        '<div>Para 1</div><div style="margin-left: 20px"><div>Para 1 nested</div></div><div>Para 2</div>',
      );
    });

    it('should render nested children with tab indentation in plain text', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 1', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Para 1 nested', styles: {} }],
              children: [],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // Plain text should use tab indentation
      expect(tree.toPlainText()).toBe('Para 1\r\n\tPara 1 nested');
    });

    it('should render nested children with space indentation in BBCode', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 1', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Para 1 nested', styles: {} }],
              children: [],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // BBCode should use 4 spaces per level
      expect(tree.toBBCode()).toBe('Para 1\n    Para 1 nested');
    });

    it('should handle deeply nested children (multi-level)', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Level 0', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Level 1', styles: {} }],
              children: [
                {
                  id: 'grandchild-1',
                  type: 'paragraph',
                  props: {
                    textColor: 'default',
                    backgroundColor: 'default',
                    textAlignment: 'left',
                  },
                  content: [{ type: 'text', text: 'Level 2', styles: {} }],
                  children: [],
                },
              ],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // Plain text should show increasing tab indentation
      expect(tree.toPlainText()).toBe('Level 0\r\n\tLevel 1\r\n\t\tLevel 2');

      // BBCode should show increasing space indentation
      expect(tree.toBBCode()).toBe('Level 0\n    Level 1\n        Level 2');
    });

    it('should handle multiple children at same level', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 1', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Para 1 nested', styles: {} }],
              children: [],
            },
            {
              id: 'child-2',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Para 1 nested 2', styles: {} }],
              children: [],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe(
        'Para 1\r\n\tPara 1 nested\r\n\tPara 1 nested 2',
      );
    });

    it('should find usernames in nested children', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 1 ', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [
                { type: 'text', text: 'Nested ', styles: {} },
                {
                  type: 'username',
                  props: { id: '1', shortcut: 'test', only: '' },
                  content: [{ type: 'text', text: 'NestedUser', styles: {} }],
                },
              ],
              children: [],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // Should find username in nested block
      const usernames = tree.findUsernames();
      expect(usernames.has('NestedUser')).toBe(true);
    });

    it('should render nested children as blockquotes in Markdown', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Para 1', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Para 1 nested', styles: {} }],
              children: [],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // Markdown should convert nested children to blockquotes
      expect(tree.toMarkdown()).toBe('Para 1\n\n> Para 1 nested');
    });

    it('should render deeply nested children as nested blockquotes in Markdown', () => {
      const nestedDescription: Description = [
        {
          id: 'parent-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Level 0', styles: {} }],
          children: [
            {
              id: 'child-1',
              type: 'paragraph',
              props: {
                textColor: 'default',
                backgroundColor: 'default',
                textAlignment: 'left',
              },
              content: [{ type: 'text', text: 'Level 1', styles: {} }],
              children: [
                {
                  id: 'grandchild-1',
                  type: 'paragraph',
                  props: {
                    textColor: 'default',
                    backgroundColor: 'default',
                    textAlignment: 'left',
                  },
                  content: [{ type: 'text', text: 'Level 2', styles: {} }],
                  children: [],
                },
              ],
            },
          ],
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
        nestedDescription as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      // Markdown should convert deeply nested children to nested blockquotes
      expect(tree.toMarkdown()).toBe('Level 0\n\n> Level 1\n> \n> > Level 2');
    });
  });

  describe('titleShortcut', () => {
    it('should detect titleShortcut block with hasTitleShortcut()', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'para',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Some text', styles: {}, props: {} }],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Title',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.hasTitleShortcut()).toBe(true);
      expect(tree.hasTagsShortcut()).toBe(false);
    });

    it('should render titleShortcut as heading in HTML', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Title',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe('<h2>My Title</h2>');
    });

    it('should render titleShortcut as heading in BBCode', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Title',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toBBCode()).toBe('[h2]My Title[/h2]');
    });

    it('should render titleShortcut as plain text', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Title',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('My Title');
    });

    it('should skip titleShortcut when title is empty', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'para',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Some text', styles: {}, props: {} }],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe('<div>Some text</div>');
      expect(tree.toBBCode()).toBe('Some text');
      expect(tree.toPlainText()).toBe('Some text');
    });

    it('should skip titleShortcut when title is undefined', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: undefined,
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe('');
      expect(tree.toBBCode()).toBe('');
      expect(tree.toPlainText()).toBe('');
    });

    it('should escape HTML entities in title', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '<script>alert("xss")</script>',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe(
        '<h2>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</h2>',
      );
    });
  });

  describe('tagsShortcut', () => {
    it('should detect tagsShortcut block with hasTagsShortcut()', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'para',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Some text', styles: {}, props: {} }],
          children: [],
        },
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: ['tag1', 'tag2'],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.hasTagsShortcut()).toBe(true);
      expect(tree.hasTitleShortcut()).toBe(false);
    });

    it('should render tagsShortcut as space-separated tags in HTML', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe('<div>tag1 tag2 tag3</div>');
    });

    it('should render tagsShortcut as space-separated tags in BBCode', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toBBCode()).toBe('tag1 tag2 tag3');
    });

    it('should render tagsShortcut as space-separated tags in plain text', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('tag1 tag2 tag3');
    });

    it('should skip tagsShortcut when tags is empty array', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'para',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Some text', styles: {}, props: {} }],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe('<div>Some text</div>');
      expect(tree.toBBCode()).toBe('Some text');
      expect(tree.toPlainText()).toBe('Some text');
    });

    it('should skip tagsShortcut when tags is undefined', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: undefined,
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe('');
      expect(tree.toBBCode()).toBe('');
      expect(tree.toPlainText()).toBe('');
    });
  });

  describe('findBlockNodesByType', () => {
    it('should find all block nodes of a specific type', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-1',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'para',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Text', styles: {}, props: {} }],
          children: [],
        },
        {
          id: 'tags-1',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.findBlockNodesByType('titleShortcut').length).toBe(1);
      expect(tree.findBlockNodesByType('tagsShortcut').length).toBe(1);
      expect(tree.findBlockNodesByType('paragraph').length).toBe(1);
      expect(tree.findBlockNodesByType('heading').length).toBe(0);
    });

    it('should find block nodes in nested children', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'parent',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Parent', styles: {}, props: {} }],
          children: [
            {
              id: 'nested-title',
              type: 'titleShortcut',
              props: {},
              content: [],
              children: [],
            },
          ],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.findBlockNodesByType('titleShortcut').length).toBe(1);
      expect(tree.hasTitleShortcut()).toBe(true);
    });
  });

  describe('combined title and tags shortcuts', () => {
    it('should render both titleShortcut and tagsShortcut in correct positions', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'para',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Description body', styles: {}, props: {} },
          ],
          children: [],
        },
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Title',
        tags: ['tag1', 'tag2'],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe(
        '<h2>My Title</h2><div>Description body</div><div>tag1 tag2</div>',
      );
      expect(tree.toBBCode()).toBe(
        '[h2]My Title[/h2]\nDescription body\ntag1 tag2',
      );
      expect(tree.toPlainText()).toBe(
        'My Title\r\nDescription body\r\ntag1 tag2',
      );
    });

    it('should detect both shortcuts present', () => {
      const description: IDescriptionBlockNode[] = [
        {
          id: 'title-shortcut',
          type: 'titleShortcut',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'tags-shortcut',
          type: 'tagsShortcut',
          props: {},
          content: [],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'Title',
        tags: ['tag'],
      };

      const tree = new DescriptionNodeTree(context, description, {
        insertAd: false,
      });

      expect(tree.hasTitleShortcut()).toBe(true);
      expect(tree.hasTagsShortcut()).toBe(true);
    });
  });
});

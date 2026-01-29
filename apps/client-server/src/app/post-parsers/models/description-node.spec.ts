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

    it('should convert cross-platform username tags to target website', () => {
      // This test covers the use case where a Twitter username should be
      // converted to a Bluesky username when posting to Bluesky
      const description: Description = [
        {
          id: 'test-cross-platform',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '1', shortcut: 'twitter', only: '' },
              content: [{ type: 'text', text: 'abcd', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'bluesky',
        shortcuts: {
          twitter: {
            id: 'twitter',
            url: 'https://x.com/$1',
          },
          bluesky: {
            id: 'bluesky',
            url: 'https://bsky.app/profile/$1',
          },
        },
        customShortcuts: new Map(),
        defaultDescription: [],
        // User has configured: twitter="abcd" -> bluesky="abcd.bsky.app"
        usernameConversions: new Map([['abcd', 'abcd.bsky.app']]),
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      // Should convert to Bluesky username and use Bluesky URL
      expect(tree.toPlainText()).toBe('https://bsky.app/profile/abcd.bsky.app');
      expect(tree.toHtml()).toBe(
        '<div><a target="_blank" href="https://bsky.app/profile/abcd.bsky.app">abcd.bsky.app</a></div>',
      );
    });

    it('should keep original username when no conversion exists', () => {
      const description: Description = [
        {
          id: 'test-no-conversion',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '1', shortcut: 'twitter', only: '' },
              content: [{ type: 'text', text: 'someuser', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'bluesky',
        shortcuts: {
          twitter: {
            id: 'twitter',
            url: 'https://x.com/$1',
          },
          bluesky: {
            id: 'bluesky',
            url: 'https://bsky.app/profile/$1',
          },
        },
        customShortcuts: new Map(),
        defaultDescription: [],
        usernameConversions: new Map(), // No conversion defined
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      // Should keep original Twitter link since no conversion exists
      expect(tree.toPlainText()).toBe('https://x.com/someuser');
      expect(tree.toHtml()).toBe(
        '<div><a target="_blank" href="https://x.com/someuser">someuser</a></div>',
      );
    });

    it('should convert usernames when shortcut ID matches target website', () => {
      const description: Description = [
        {
          id: 'test-matching-platform',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: { id: '1', shortcut: 'bluesky', only: '' },
              content: [{ type: 'text', text: 'x', styles: {} }],
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'bluesky',
        shortcuts: {
          twitter: {
            id: 'twitter',
            url: 'https://x.com/$1',
          },
          bluesky: {
            id: 'bluesky',
            url: 'https://bsky.app/profile/$1',
          },
        },
        customShortcuts: new Map(),
        defaultDescription: [],
        // User has configured a converter for "x" to "bluesky_user" for bluesky
        usernameConversions: new Map([['x', 'bluesky_user']]),
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      // Should use converted username "bluesky_user" since shortcut matches website
      expect(tree.toPlainText()).toBe(
        'https://bsky.app/profile/bluesky_user',
      );
      expect(tree.toHtml()).toBe(
        '<div><a target="_blank" href="https://bsky.app/profile/bluesky_user">bluesky_user</a></div>',
      );
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

  describe('system inline shortcuts', () => {
    it('should render titleShortcut with title from context', () => {
      const description = [
        {
          id: 'test-title-shortcut',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Title: ', styles: {} },
            { type: 'titleShortcut', props: {} },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Amazing Artwork',
        tags: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe('Title: My Amazing Artwork');
      expect(tree.toHtml()).toBe(
        '<div>Title: <span>My Amazing Artwork</span></div>',
      );
      expect(tree.toBBCode()).toBe('Title: My Amazing Artwork');
    });

    it('should render tagsShortcut with tags from context', () => {
      const description = [
        {
          id: 'test-tags-shortcut',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Tags: ', styles: {} },
            { type: 'tagsShortcut', props: {} },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: '',
        tags: ['art', 'digital', 'fantasy'],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe('Tags: art digital fantasy');
      expect(tree.toHtml()).toBe(
        '<div>Tags: <span>art digital fantasy</span></div>',
      );
      expect(tree.toBBCode()).toBe('Tags: art digital fantasy');
    });

    it('should render contentWarningShortcut with content warning from context', () => {
      const description = [
        {
          id: 'test-cw-shortcut',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'CW: ', styles: {} },
            { type: 'contentWarningShortcut', props: {} },
          ],
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
        contentWarningText: 'Mild Violence',
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe('CW: Mild Violence');
      expect(tree.toHtml()).toBe('<div>CW: <span>Mild Violence</span></div>');
      expect(tree.toBBCode()).toBe('CW: Mild Violence');
    });

    it('should render empty string when title is not in context', () => {
      const description = [
        {
          id: 'test-empty-title',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Title: ', styles: {} },
            { type: 'titleShortcut', props: {} },
            { type: 'text', text: ' end', styles: {} },
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
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe('Title:  end');
    });

    it('should render empty string when tags array is empty', () => {
      const description = [
        {
          id: 'test-empty-tags',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Tags: ', styles: {} },
            { type: 'tagsShortcut', props: {} },
            { type: 'text', text: ' end', styles: {} },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        tags: [],
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe('Tags:  end');
    });

    it('should render all system shortcuts together', () => {
      const description = [
        {
          id: 'test-all-shortcuts',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'titleShortcut', props: {} },
            { type: 'text', text: ' - ', styles: {} },
            { type: 'contentWarningShortcut', props: {} },
          ],
          children: [],
        },
        {
          id: 'test-tags-line',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'tagsShortcut', props: {} }],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        title: 'My Art',
        tags: ['tag1', 'tag2'],
        contentWarningText: 'NSFW',
      };

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toPlainText()).toBe('My Art - NSFW\r\ntag1 tag2');
      expect(tree.toHtml()).toBe(
        '<div><span>My Art</span> - <span>NSFW</span></div><div><span>tag1 tag2</span></div>',
      );
    });

    it('should HTML encode special characters in title', () => {
      const description = [
        {
          id: 'test-encode-title',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'titleShortcut', props: {} }],
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

      const tree = new DescriptionNodeTree(
        context,
        description as unknown as Array<IDescriptionBlockNode>,
        { insertAd: false },
      );

      expect(tree.toHtml()).toBe(
        '<div><span>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span></div>',
      );
    });
  });

  describe('Username shortcuts with new prop format', () => {
    it('should support username prop format (content: none)', () => {
      const shortcutDescription: Description = [
        {
          id: 'test-username-prop',
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
                username: 'TestUser',
              },
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

      expect(tree.toPlainText()).toBe('Hello, https://test.postybirb.com/TestUser');
      expect(tree.toHtml()).toBe(
        '<div><span><b>Hello, </b></span><a target="_blank" href="https://test.postybirb.com/TestUser">TestUser</a></div>',
      );
      expect(tree.toBBCode()).toBe(
        '[b]Hello, [/b][url=https://test.postybirb.com/TestUser]TestUser[/url]',
      );
    });

    it('should find usernames from new prop format', () => {
      const description: Description = [
        {
          id: 'test-find-username',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: {
                id: '1',
                shortcut: 'twitter',
                only: '',
                username: 'alice',
              },
            },
            { type: 'text', text: ' and ', styles: {} },
            {
              type: 'username',
              props: {
                id: '2',
                shortcut: 'twitter',
                only: '',
                username: 'bob',
              },
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
      expect(usernames.has('alice')).toBe(true);
      expect(usernames.has('bob')).toBe(true);
    });

    it('should support username conversion with new prop format', () => {
      const shortcutDescription: Description = [
        {
          id: 'test-username-conversion',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Follow me: ', styles: {} },
            {
              type: 'username',
              props: {
                id: '1740142676292',
                shortcut: 'twitter',
                only: '',
                username: 'myusername',
              },
            },
          ],
          children: [],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {
          twitter: {
            id: 'twitter',
            url: 'https://twitter.com/$1',
          },
          test: {
            id: 'test',
            url: 'https://test.postybirb.com/$1',
          },
        },
        customShortcuts: new Map(),
        defaultDescription: [],
        usernameConversions: new Map([['myusername', 'converted_username']]),
      };

      const tree = new DescriptionNodeTree(
        context,
        shortcutDescription as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      expect(tree.toPlainText()).toBe('Follow me: https://test.postybirb.com/converted_username');
      expect(tree.toHtml()).toBe(
        '<div>Follow me: <a target="_blank" href="https://test.postybirb.com/converted_username">converted_username</a></div>',
      );
    });

    it('should handle backward compatibility with old content format', () => {
      const oldFormatDescription: Description = [
        {
          id: 'test-old-format',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Hello, ', styles: {} },
            {
              type: 'username',
              props: {
                id: '1',
                shortcut: 'test',
                only: '',
              },
              content: [
                {
                  type: 'text',
                  text: 'OldFormatUser',
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
        oldFormatDescription as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      expect(tree.toPlainText()).toBe('Hello, https://test.postybirb.com/OldFormatUser');
      expect(tree.findUsernames().has('OldFormatUser')).toBe(true);
    });

    it('should handle empty username prop gracefully', () => {
      const emptyUsernameDescription: Description = [
        {
          id: 'test-empty-username',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            {
              type: 'username',
              props: {
                id: '1',
                shortcut: 'test',
                only: '',
                username: '',
              },
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
        emptyUsernameDescription as unknown as Array<IDescriptionBlockNode>,
        {
          insertAd: false,
        },
      );

      expect(tree.toPlainText()).toBe('');
      expect(tree.findUsernames().size).toBe(0);
    });
  });
});

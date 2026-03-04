import { TipTapNode } from '@postybirb/types';
import { DescriptionNodeTree } from './description-node/description-node-tree';
import { ConversionContext } from './description-node/description-node.base';

describe('DescriptionNode', () => {
  it('should support username shortcuts', () => {
    const nodes: TipTapNode[] = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello, ', marks: [{ type: 'bold' }] },
          {
            type: 'username',
            attrs: {
              shortcut: 'test',
              only: '',
              username: 'User',
            },
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

    const tree = new DescriptionNodeTree(context, nodes, {
      insertAd: false,
    });

    expect(tree.toPlainText()).toBe('Hello, https://test.postybirb.com/User');
    expect(tree.toHtml()).toBe(
      '<div><span><b>Hello, </b></span><a target="_blank" href="https://test.postybirb.com/User">User</a></div>',
    );
    expect(tree.toBBCode()).toBe(
      '[b]Hello, [/b][url=https://test.postybirb.com/User]User[/url]',
    );
  });

  it('should support username shortcut conversion', () => {
    const nodes: TipTapNode[] = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello, ', marks: [{ type: 'bold' }] },
          {
            type: 'username',
            attrs: {
              shortcut: 'test',
              only: '',
              username: 'User',
            },
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

    const tree = new DescriptionNodeTree(context, nodes, {
      insertAd: false,
    });

    expect(tree.toPlainText()).toBe('Hello, <!~User>');
    expect(tree.toHtml()).toBe(
      '<div><span><b>Hello, </b></span><span><!~User></span></div>',
    );
    expect(tree.toBBCode()).toBe('[b]Hello, [/b]<!~User>');
  });

  it('should handle multiple paragraphs', () => {
    const nodes: TipTapNode[] = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'First paragraph.' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second paragraph.' }],
      },
    ];

    const context: ConversionContext = {
      website: 'test',
      shortcuts: {},
      customShortcuts: new Map(),
      defaultDescription: [],
    };

    const tree = new DescriptionNodeTree(context, nodes, {
      insertAd: false,
    });

    expect(tree.toPlainText()).toBe('First paragraph.\r\nSecond paragraph.');
    expect(tree.toHtml()).toBe(
      '<div>First paragraph.</div><div>Second paragraph.</div>',
    );
    expect(tree.toBBCode()).toBe('First paragraph.\nSecond paragraph.');
  });

  describe('findUsernames', () => {
    it('should find all usernames in the tree', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: 'User1',
              },
            },
            { type: 'text', text: ' and ' },
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: 'User2',
              },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(2);
      expect(usernames.has('User1')).toBe(true);
      expect(usernames.has('User2')).toBe(true);
    });

    it('should find usernames across multiple paragraphs', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: { shortcut: 'test', only: '', username: 'Alice' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: { shortcut: 'test', only: '', username: 'Bob' },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(2);
      expect(usernames.has('Alice')).toBe(true);
      expect(usernames.has('Bob')).toBe(true);
    });

    it('should return empty set when no usernames exist', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Just plain text' }],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(0);
    });

    it('should handle duplicate usernames', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: 'SameUser',
              },
            },
            { type: 'text', text: ' and ' },
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: 'SameUser',
              },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(1);
      expect(usernames.has('SameUser')).toBe(true);
    });
  });

  describe('findCustomShortcutIds', () => {
    it('should find all custom shortcut IDs in the tree', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Here are some shortcuts: ' },
            {
              type: 'customShortcut',
              attrs: { id: 'shortcut-1' },
            },
            { type: 'text', text: ' and ' },
            {
              type: 'customShortcut',
              attrs: { id: 'shortcut-2' },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(2);
      expect(shortcutIds.has('shortcut-1')).toBe(true);
      expect(shortcutIds.has('shortcut-2')).toBe(true);
    });

    it('should find shortcuts across multiple paragraphs', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'customShortcut',
              attrs: { id: 'shortcut-a' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'customShortcut',
              attrs: { id: 'shortcut-b' },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(2);
      expect(shortcutIds.has('shortcut-a')).toBe(true);
      expect(shortcutIds.has('shortcut-b')).toBe(true);
    });

    it('should return empty set when no custom shortcuts exist', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Just plain text' }],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(0);
    });

    it('should handle duplicate shortcut IDs', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'customShortcut',
              attrs: { id: 'same-id' },
            },
            { type: 'text', text: ' and ' },
            {
              type: 'customShortcut',
              attrs: { id: 'same-id' },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(1);
      expect(shortcutIds.has('same-id')).toBe(true);
    });

    it('should handle shortcuts without IDs gracefully', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'customShortcut',
              attrs: { id: '' },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const shortcutIds = tree.findCustomShortcutIds();
      expect(shortcutIds.size).toBe(0);
    });
  });

  describe('updateContext', () => {
    it('should allow updating context after tree creation', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: 'TestUser',
              },
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
        usernameConversions: new Map(),
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

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
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: {
                shortcut: 'twitter',
                only: '',
                username: 'abcd',
              },
            },
          ],
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
        usernameConversions: new Map([['abcd', 'abcd.bsky.app']]),
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('https://bsky.app/profile/abcd.bsky.app');
      expect(tree.toHtml()).toBe(
        '<div><a target="_blank" href="https://bsky.app/profile/abcd.bsky.app">abcd.bsky.app</a></div>',
      );
    });

    it('should keep original username when no conversion exists', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: {
                shortcut: 'twitter',
                only: '',
                username: 'someuser',
              },
            },
          ],
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
        usernameConversions: new Map(),
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('https://x.com/someuser');
      expect(tree.toHtml()).toBe(
        '<div><a target="_blank" href="https://x.com/someuser">someuser</a></div>',
      );
    });

    it('should convert usernames when shortcut ID matches target website', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: { shortcut: 'bluesky', only: '', username: 'x' },
            },
          ],
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
        usernameConversions: new Map([['x', 'bluesky_user']]),
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('https://bsky.app/profile/bluesky_user');
      expect(tree.toHtml()).toBe(
        '<div><a target="_blank" href="https://bsky.app/profile/bluesky_user">bluesky_user</a></div>',
      );
    });
  });

  describe('blockquote nesting', () => {
    it('should render blockquotes in HTML', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 1' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Para 1 nested' }],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 2' }],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe(
        '<div>Para 1</div><blockquote><div>Para 1 nested</div></blockquote><div>Para 2</div>',
      );
    });

    it('should render blockquotes in plain text with > prefix', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 1' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Para 1 nested' }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('Para 1\r\n> Para 1 nested');
    });

    it('should render blockquotes in BBCode with [quote] tags', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 1' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Para 1 nested' }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toBBCode()).toBe('Para 1\n[quote]Para 1 nested[/quote]');
    });

    it('should handle deeply nested blockquotes (multi-level)', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Level 0' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Level 1' }],
            },
            {
              type: 'blockquote',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Level 2' }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('Level 0\r\n> Level 1\r\n> > Level 2');
      expect(tree.toBBCode()).toBe(
        'Level 0\n[quote]Level 1\n[quote]Level 2[/quote][/quote]',
      );
    });

    it('should handle multiple paragraphs at same blockquote level', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 1' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Para 1 nested' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Para 1 nested 2' }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe(
        'Para 1\r\n> Para 1 nested\r\n> Para 1 nested 2',
      );
    });

    it('should find usernames in blockquotes', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 1 ' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Nested ' },
                {
                  type: 'username',
                  attrs: {
                    shortcut: 'test',
                    only: '',
                    username: 'NestedUser',
                  },
                },
              ],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const usernames = tree.findUsernames();
      expect(usernames.has('NestedUser')).toBe(true);
    });

    it('should render blockquotes in Markdown', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Para 1' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Para 1 nested' }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toMarkdown()).toBe('Para 1\n\n> Para 1 nested');
    });

    it('should render deeply nested blockquotes in Markdown', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Level 0' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Level 1' }],
            },
            {
              type: 'blockquote',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Level 2' }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toMarkdown()).toBe('Level 0\n\n> Level 1\n> \n> > Level 2');
    });
  });

  describe('system inline shortcuts', () => {
    it('should render titleShortcut with title from context', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Title: ' },
            { type: 'titleShortcut', attrs: {} },
          ],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('Title: My Amazing Artwork');
      expect(tree.toHtml()).toBe(
        '<div>Title: <span>My Amazing Artwork</span></div>',
      );
      expect(tree.toBBCode()).toBe('Title: My Amazing Artwork');
    });

    it('should render tagsShortcut with tags from context', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Tags: ' },
            { type: 'tagsShortcut', attrs: {} },
          ],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('Tags: #art #digital #fantasy');
      expect(tree.toHtml()).toBe(
        '<div>Tags: <span>#art #digital #fantasy</span></div>',
      );
      expect(tree.toBBCode()).toBe('Tags: #art #digital #fantasy');
    });

    it('should render contentWarningShortcut with content warning from context', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'CW: ' },
            { type: 'contentWarningShortcut', attrs: {} },
          ],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('CW: Mild Violence');
      expect(tree.toHtml()).toBe('<div>CW: <span>Mild Violence</span></div>');
      expect(tree.toBBCode()).toBe('CW: Mild Violence');
    });

    it('should render empty string when title is not in context', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Title: ' },
            { type: 'titleShortcut', attrs: {} },
            { type: 'text', text: ' end' },
          ],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('Title:  end');
    });

    it('should render empty string when tags array is empty', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Tags: ' },
            { type: 'tagsShortcut', attrs: {} },
            { type: 'text', text: ' end' },
          ],
        },
      ];

      const context: ConversionContext = {
        website: 'test',
        shortcuts: {},
        customShortcuts: new Map(),
        defaultDescription: [],
        tags: [],
      };

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('Tags:  end');
    });

    it('should render all system shortcuts together', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'titleShortcut', attrs: {} },
            { type: 'text', text: ' - ' },
            { type: 'contentWarningShortcut', attrs: {} },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'tagsShortcut', attrs: {} }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('My Art - NSFW\r\n#tag1 #tag2');
      expect(tree.toHtml()).toBe(
        '<div><span>My Art</span> - <span>NSFW</span></div><div><span>#tag1 #tag2</span></div>',
      );
    });

    it('should HTML encode special characters in title', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [{ type: 'titleShortcut', attrs: {} }],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toHtml()).toBe(
        '<div><span>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span></div>',
      );
    });
  });

  describe('Username shortcuts', () => {
    it('should support username attrs format', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello, ', marks: [{ type: 'bold' }] },
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: 'TestUser',
              },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe(
        'Hello, https://test.postybirb.com/TestUser',
      );
      expect(tree.toHtml()).toBe(
        '<div><span><b>Hello, </b></span><a target="_blank" href="https://test.postybirb.com/TestUser">TestUser</a></div>',
      );
      expect(tree.toBBCode()).toBe(
        '[b]Hello, [/b][url=https://test.postybirb.com/TestUser]TestUser[/url]',
      );
    });

    it('should find usernames from attrs format', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: {
                shortcut: 'twitter',
                only: '',
                username: 'alice',
              },
            },
            { type: 'text', text: ' and ' },
            {
              type: 'username',
              attrs: {
                shortcut: 'twitter',
                only: '',
                username: 'bob',
              },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      const usernames = tree.findUsernames();
      expect(usernames.size).toBe(2);
      expect(usernames.has('alice')).toBe(true);
      expect(usernames.has('bob')).toBe(true);
    });

    it('should support username conversion', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Follow me: ' },
            {
              type: 'username',
              attrs: {
                shortcut: 'twitter',
                only: '',
                username: 'myusername',
              },
            },
          ],
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe(
        'Follow me: https://test.postybirb.com/converted_username',
      );
      expect(tree.toHtml()).toBe(
        '<div>Follow me: <a target="_blank" href="https://test.postybirb.com/converted_username">converted_username</a></div>',
      );
    });

    it('should handle empty username gracefully', () => {
      const nodes: TipTapNode[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: {
                shortcut: 'test',
                only: '',
                username: '',
              },
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

      const tree = new DescriptionNodeTree(context, nodes, {
        insertAd: false,
      });

      expect(tree.toPlainText()).toBe('');
      expect(tree.findUsernames().size).toBe(0);
    });
  });
});

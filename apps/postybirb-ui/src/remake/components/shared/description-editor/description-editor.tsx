/* eslint-disable lingui/text-restrictions */
/* eslint-disable lingui/no-unlocalized-strings */
import { useLingui } from '@lingui/react/macro';
import { Box, useMantineColorScheme } from '@mantine/core';
import type { Description } from '@postybirb/types';
import {
  IconAlertTriangle,
  IconBlockquote,
  IconH1,
  IconH2,
  IconH3,
  IconLine,
  IconList,
  IconListNumbers,
  IconQuote,
  IconTags,
  IconTextPlus,
  IconUser,
} from '@tabler/icons-react';
import { Extension } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Color from '@tiptap/extension-color';
import Document from '@tiptap/extension-document';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import TextNode from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { PluginKey } from '@tiptap/pm/state';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { useCallback, useMemo, useRef } from 'react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';

import { useCustomShortcuts } from '../../../stores/entity/custom-shortcut-store';
import { useWebsites } from '../../../stores/entity/website-store';
import { BubbleToolbar } from './components/bubble-toolbar';
import { DescriptionToolbar } from './components/description-toolbar';
import {
  filterSuggestionItems,
  SuggestionMenu,
  type SuggestionItem,
  type SuggestionMenuRef,
} from './components/suggestion-menu';
import {
  ContentWarningShortcutExtension,
  CustomShortcutExtension,
  DefaultShortcutExtension,
  Indent,
  TagsShortcutExtension,
  TitleShortcutExtension,
  UsernameShortcutExtension,
} from './extensions';

import './custom-blocks/shortcut.css';
import './description-editor.css';

export type DescriptionEditorProps = {
  /** Initial content for the editor. */
  value?: Description;
  /** Callback when the editor content changes. */
  onChange: (value: Description) => void;
  /** Whether this is the default editor (hides certain options). */
  isDefaultEditor?: boolean;
  /** Whether to show the custom shortcuts menu. */
  showCustomShortcuts?: boolean;
  /** Minimum height of the editor. */
  minHeight?: number;
};

/**
 * Creates a TipTap Suggestion-based extension for a given trigger character.
 */
function createSuggestionExtension(
  name: string,
  triggerChar: string,
  getItems: (query: string) => SuggestionItem[],
) {
  return Extension.create({
    name,

    addProseMirrorPlugins() {
      return [
        Suggestion<SuggestionItem>({
          pluginKey: new PluginKey(`suggestion-${name}`),
          editor: this.editor,
          char: triggerChar,
          items: ({ query }) => getItems(query),
          command: ({ editor: e, range, props }) => {
            // Delete the trigger character + query text, then run the item's action
            e.chain().focus().deleteRange(range).run();
            props.onSelect();
          },
          render: () => {
            let component: ReactRenderer<SuggestionMenuRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(SuggestionMenu, {
                  props: { items: props.items, command: props.command },
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props) => {
                component?.updateProps({ items: props.items, command: props.command });
                if (popup?.[0] && props.clientRect) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });
                }
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        }),
      ];
    },
  });
}

/**
 * TipTap-based description editor with custom shortcuts support.
 */
export function DescriptionEditor({
  value,
  onChange,
  isDefaultEditor = false,
  showCustomShortcuts,
  minHeight,
}: DescriptionEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const { t } = useLingui();
  const customShortcuts = useCustomShortcuts();
  const websites = useWebsites();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Get username shortcuts from websites
  const usernameShortcuts = useMemo(
    () =>
      websites
        .map((w) => w.usernameShortcut)
        .filter((shortcut): shortcut is NonNullable<typeof shortcut> =>
          Boolean(shortcut),
        ),
    [websites],
  );

  // Slash menu items
  const getSlashItems = useCallback(
    (query: string): SuggestionItem[] => {
      const items: SuggestionItem[] = [
        {
          title: 'Heading 1',
          icon: <IconH1 size={16} />,
          aliases: ['h1', 'heading1'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().toggleHeading({ level: 1 }).run();
          },
        },
        {
          title: 'Heading 2',
          icon: <IconH2 size={16} />,
          aliases: ['h2', 'heading2'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().toggleHeading({ level: 2 }).run();
          },
        },
        {
          title: 'Heading 3',
          icon: <IconH3 size={16} />,
          aliases: ['h3', 'heading3'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().toggleHeading({ level: 3 }).run();
          },
        },
        {
          title: 'Bullet List',
          icon: <IconList size={16} />,
          aliases: ['ul', 'unordered', 'list'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().toggleBulletList().run();
          },
        },
        {
          title: 'Ordered List',
          icon: <IconListNumbers size={16} />,
          aliases: ['ol', 'numbered', 'list'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().toggleOrderedList().run();
          },
        },
        {
          title: 'Blockquote',
          icon: <IconBlockquote size={16} />,
          aliases: ['quote', 'blockquote'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().toggleBlockquote().run();
          },
        },
        {
          title: 'Divider',
          icon: <IconLine size={16} />,
          aliases: ['hr', 'horizontal', 'rule', 'divider'],
          group: 'Blocks',
          onSelect: () => {
            editor?.chain().focus().setHorizontalRule().run();
          },
        },
      ];
      return filterSuggestionItems(items, query);
    },
    // editor ref is captured below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Shortcut menu items (for @, `, { triggers)
  const getShortcutItems = useCallback(
    (query: string): SuggestionItem[] => {
      const items: SuggestionItem[] = [];

      // Default shortcut (not in default editor to avoid recursion)
      if (!isDefaultEditor) {
        items.push({
          title: 'Default',
          aliases: ['default', 'placeholder', 'description'],
          group: 'Shortcuts',
          icon: <IconTextPlus size={18} />,
          onSelect: () => {
            editor?.chain().focus().insertContent({ type: 'defaultShortcut', attrs: { only: '' } }).run();
          },
        });
      }

      // System shortcuts
      items.push(
        {
          title: 'Title',
          aliases: ['title', 'name'],
          icon: <IconH1 size={16} />,
          group: 'Shortcuts',
          onSelect: () => {
            editor?.chain().focus().insertContent([
              { type: 'titleShortcut', attrs: { only: '' } },
              { type: 'text', text: ' ' },
            ]).run();
          },
        },
        {
          title: 'Tags',
          aliases: ['tags', 'keywords'],
          icon: <IconTags size={16} />,
          group: 'Shortcuts',
          onSelect: () => {
            editor?.chain().focus().insertContent([
              { type: 'tagsShortcut', attrs: { only: '' } },
              { type: 'text', text: ' ' },
            ]).run();
          },
        },
        {
          title: 'Content Warning',
          aliases: ['content warning', 'cw', 'warning', 'nsfw'],
          icon: <IconAlertTriangle size={16} />,
          group: 'Shortcuts',
          onSelect: () => {
            editor?.chain().focus().insertContent([
              { type: 'contentWarningShortcut', attrs: { only: '' } },
              { type: 'text', text: ' ' },
            ]).run();
          },
        },
      );

      // Custom shortcuts
      if (showCustomShortcuts && customShortcuts) {
        for (const sc of customShortcuts) {
          items.push({
            title: sc.name,
            icon: <IconQuote size={16} />,
            group: 'Custom Shortcuts',
            onSelect: () => {
              editor?.chain().focus().insertContent([
                { type: 'customShortcut', attrs: { id: sc.id, only: '' } },
                { type: 'text', text: ' ' },
              ]).run();
            },
          });
        }
      }

      // Username shortcuts
      for (const sc of usernameShortcuts) {
        items.push({
          title: sc.id,
          icon: <IconUser size={16} />,
          group: 'Username Shortcuts',
          onSelect: () => {
            editor?.chain().focus().insertContent([
              {
                type: 'username',
                attrs: {
                  id: Date.now().toString(),
                  shortcut: sc.id,
                  only: '',
                  username: '',
                },
              },
              { type: 'text', text: ' ' },
            ]).run();
          },
        });
      }

      return filterSuggestionItems(items, query);
    },
    [isDefaultEditor, showCustomShortcuts, customShortcuts, usernameShortcuts],
  );

  // Build suggestion extensions
  const suggestionExtensions = useMemo(
    () => [
      createSuggestionExtension('slashMenu', '/', getSlashItems),
      createSuggestionExtension('shortcutMenuAt', '@', getShortcutItems),
      createSuggestionExtension('shortcutMenuBacktick', '`', getShortcutItems),
      createSuggestionExtension('shortcutMenuBrace', '{', getShortcutItems),
    ],
    [getSlashItems, getShortcutItems],
  );

  const editor = useEditor({
    extensions: [
      // Core
      Document,
      Paragraph,
      TextNode,
      HardBreak,

      // Formatting marks
      Bold,
      Italic,
      Strike,
      Underline,
      Code,
      TextStyle,
      Color,

      // Block types
      Heading.configure({ levels: [1, 2, 3] }),
      Blockquote,
      HorizontalRule,
      BulletList,
      OrderedList,
      ListItem,
      CodeBlock,

      // Behavior
      History,
      Dropcursor,
      Gapcursor,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Indent,
      Placeholder.configure({
        placeholder: t`Type / for commands or @, \` or '{' for shortcuts`,
      }),

      // Custom shortcut nodes
      DefaultShortcutExtension,
      CustomShortcutExtension,
      UsernameShortcutExtension,
      TitleShortcutExtension,
      TagsShortcutExtension,
      ContentWarningShortcutExtension,

      // Suggestion menus
      ...suggestionExtensions,
    ],
    content: value && value.content && value.content.length > 0 ? value : undefined,
    onUpdate: ({ editor: e }) => {
      onChangeRef.current(e.getJSON() as Description);
    },
  });

  return (
    <Box
      style={{ minHeight, height: '100%' }}
      className="description-editor-container"
      data-theme={colorScheme}
    >
      <DescriptionToolbar editor={editor} />
      <Box className="tiptap-editor-wrapper" style={{ flex: 1 }}>
        {editor && <BubbleToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

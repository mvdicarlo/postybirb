/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import {
    DefaultReactSuggestionItem,
    createReactInlineContentSpec,
} from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
import { IconAlertTriangle, IconH1, IconTags } from '@tabler/icons-react';

/**
 * Inline content spec for Title shortcut.
 * Renders as a blue badge that will be replaced with the submission title.
 */
export const InlineTitleShortcut = createReactInlineContentSpec(
  {
    type: 'titleShortcut',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => (
      <Badge
        variant="outline"
        radius="xs"
        size="sm"
        tt="none"
        color="blue"
        contentEditable={false}
      >
        <Trans>Title</Trans>
      </Badge>
    ),
  },
);

/**
 * Inline content spec for Tags shortcut.
 * Renders as a teal badge that will be replaced with the submission tags.
 */
export const InlineTagsShortcut = createReactInlineContentSpec(
  {
    type: 'tagsShortcut',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => (
      <Badge
        variant="outline"
        radius="xs"
        size="sm"
        tt="none"
        color="teal"
        contentEditable={false}
      >
        <Trans>Tags</Trans>
      </Badge>
    ),
  },
);

/**
 * Inline content spec for Content Warning shortcut.
 * Renders as an orange badge that will be replaced with the content warning.
 */
export const InlineContentWarningShortcut = createReactInlineContentSpec(
  {
    type: 'contentWarningShortcut',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => (
      <Badge
        variant="outline"
        radius="xs"
        size="sm"
        tt="none"
        color="orange"
        contentEditable={false}
      >
        <Trans>Content Warning</Trans>
      </Badge>
    ),
  },
);

/**
 * Creates menu items for system shortcuts in the suggestion menu.
 */
export function getSystemShortcutsMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
): DefaultReactSuggestionItem[] {
  return [
    {
      title: 'Title',
      aliases: ['title', 'name'],
      icon: <IconH1 size={16} />,
      onItemClick: () => {
        editor.insertInlineContent([
          {
            type: 'titleShortcut',
          } as never,
          ' ',
        ]);
      },
      group: 'Shortcuts',
    },
    {
      title: 'Tags',
      aliases: ['tags', 'keywords'],
      icon: <IconTags size={16} />,
      onItemClick: () => {
        editor.insertInlineContent([
          {
            type: 'tagsShortcut',
          } as never,
          ' ',
        ]);
      },
      group: 'Shortcuts',
    },
    {
      title: 'Content Warning',
      aliases: ['content warning', 'cw', 'warning', 'nsfw'],
      icon: <IconAlertTriangle size={16} />,
      onItemClick: () => {
        editor.insertInlineContent([
          {
            type: 'contentWarningShortcut',
          } as never,
          ' ',
        ]);
      },
      group: 'Shortcuts',
    },
  ];
}

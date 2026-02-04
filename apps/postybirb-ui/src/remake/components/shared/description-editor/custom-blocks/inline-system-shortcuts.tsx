/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import {
    DefaultReactSuggestionItem,
    createReactInlineContentSpec,
} from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
import { IconAlertTriangle, IconH1, IconTags } from '@tabler/icons-react';
import { useCallback } from 'react';
import './shortcut.css';
import { WebsiteOnlySelector } from './website-only-selector';

/**
 * Inline content spec for Title shortcut.
 * Renders as a blue badge that will be replaced with the submission title.
 */
export const InlineTitleShortcut = createReactInlineContentSpec(
  {
    type: 'titleShortcut',
    propSchema: {
      only: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const onlyProp = props.inlineContent.props.only as string;

      const handleOnlyChange = useCallback(
        (newOnly: string) => {
          props.updateInlineContent({
            ...props.inlineContent,
            props: {
              ...props.inlineContent.props,
              only: newOnly,
            },
          });
        },
        [props]
      );

      return (
        <span className="system-shortcut-container" style={{ verticalAlign: 'text-bottom' }}>
          <Badge
            variant="outline"
            radius="xs"
            size="sm"
            tt="none"
            color="blue"
            contentEditable={false}
          >
            <Trans>Title</Trans>
            <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
            <WebsiteOnlySelector only={onlyProp} onOnlyChange={handleOnlyChange} />
          </Badge>
        </span>
      );
    },
  }
);

/**
 * Inline content spec for Tags shortcut.
 * Renders as a teal badge that will be replaced with the submission tags.
 */
export const InlineTagsShortcut = createReactInlineContentSpec(
  {
    type: 'tagsShortcut',
    propSchema: {
      only: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const onlyProp = props.inlineContent.props.only as string;

      const handleOnlyChange = useCallback(
        (newOnly: string) => {
          props.updateInlineContent({
            ...props.inlineContent,
            props: {
              ...props.inlineContent.props,
              only: newOnly,
            },
          });
        },
        [props]
      );

      return (
        <span className="system-shortcut-container" style={{ verticalAlign: 'text-bottom' }}>
          <Badge
            variant="outline"
            radius="xs"
            size="sm"
            tt="none"
            color="teal"
            contentEditable={false}
          >
            <Trans>Tags</Trans>
            <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
            <WebsiteOnlySelector only={onlyProp} onOnlyChange={handleOnlyChange} />
          </Badge>
        </span>
      );
    },
  }
);

/**
 * Inline content spec for Content Warning shortcut.
 * Renders as an orange badge that will be replaced with the content warning.
 */
export const InlineContentWarningShortcut = createReactInlineContentSpec(
  {
    type: 'contentWarningShortcut',
    propSchema: {
      only: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const onlyProp = props.inlineContent.props.only as string;

      const handleOnlyChange = useCallback(
        (newOnly: string) => {
          props.updateInlineContent({
            ...props.inlineContent,
            props: {
              ...props.inlineContent.props,
              only: newOnly,
            },
          });
        },
        [props]
      );

      return (
        <span className="system-shortcut-container" style={{ verticalAlign: 'text-bottom' }}>
          <Badge
            variant="outline"
            radius="xs"
            size="sm"
            tt="none"
            color="orange"
            contentEditable={false}
          >
            <Trans>Content Warning</Trans>
            <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
            <WebsiteOnlySelector only={onlyProp} onOnlyChange={handleOnlyChange} />
          </Badge>
        </span>
      );
    },
  }
);

/**
 * Creates menu items for system shortcuts in the suggestion menu.
 */
export function getSystemShortcutsMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>
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
            props: { only: '' },
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
            props: { only: '' },
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
            props: { only: '' },
          } as never,
          ' ',
        ]);
      },
      group: 'Shortcuts',
    },
  ];
}

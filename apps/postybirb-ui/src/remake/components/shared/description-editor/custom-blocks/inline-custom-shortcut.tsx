/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import {
    DefaultReactSuggestionItem,
    createReactInlineContentSpec,
} from '@blocknote/react';
import { Badge } from '@mantine/core';
import { IconBlockquote } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { CustomShortcutRecord, useCustomShortcuts } from '../../../../stores';
import './shortcut.css';
import { WebsiteOnlySelector } from './website-only-selector';

/**
 * Inline content spec for custom shortcuts.
 * Renders as a grape-colored badge with the shortcut name.
 */
export const InlineCustomShortcut = createReactInlineContentSpec(
  {
    type: 'customShortcut',
    propSchema: {
      id: { default: '' },
      only: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const shortcuts = useCustomShortcuts();
      const shortcut = useMemo(() => {
        const id = props.inlineContent.props.id as string;
        if (!id) return undefined;
        return shortcuts?.find((s) => s.id === id);
      }, [shortcuts, props.inlineContent.props.id]);

      const name = shortcut?.name ?? (props.inlineContent.props.id as string);
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
        <span className="custom-shortcut-container" style={{ verticalAlign: 'text-bottom' }}>
          <Badge
            variant="outline"
            radius="xs"
            size="sm"
            tt="none"
            color="grape"
            contentEditable={false}
          >
            {name}
            <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
            <WebsiteOnlySelector only={onlyProp} onOnlyChange={handleOnlyChange} />
          </Badge>
        </span>
      );
    },
  }
);

/**
 * Creates menu items for custom shortcuts in the suggestion menu.
 */
export function getCustomShortcutsMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  shortcuts: CustomShortcutRecord[] = []
): DefaultReactSuggestionItem[] {
  return shortcuts.map((sc) => ({
    title: sc.name,
    icon: <IconBlockquote size={16} />,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'customShortcut',
          props: { id: sc.id, only: '' },
        } as never,
        ' ',
      ]);
    },
    group: 'Custom Shortcuts',
  }));
}

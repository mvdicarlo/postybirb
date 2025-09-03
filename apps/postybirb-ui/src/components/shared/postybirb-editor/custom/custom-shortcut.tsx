/* eslint-disable react-hooks/rules-of-hooks */
import {
    DefaultReactSuggestionItem,
    createReactInlineContentSpec,
} from '@blocknote/react';
import { Badge } from '@mantine/core';
import { ICustomShortcutDto } from '@postybirb/types';
import { IconBlockquote } from '@tabler/icons-react';
import { useMemo } from 'react';
import { CustomShortcutStore } from '../../../../stores/custom-shortcut.store';
import { useStore } from '../../../../stores/use-store';
import { schema } from '../schema';

export const InlineCustomShortcut = createReactInlineContentSpec(
  {
    type: 'customShortcut',
    propSchema: {
      id: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { state: shortcuts } = useStore(CustomShortcutStore);
      const shortcut = useMemo(() => {
        const id = props.inlineContent.props.id as string;
        if (!id) return undefined;
        return shortcuts?.find((s) => s.id === id);
      }, [shortcuts, props.inlineContent.props.id]);

      const name = shortcut?.name ?? (props.inlineContent.props.id as string);

      return (
        <Badge
          variant="outline"
          radius="xs"
          size="sm"
          tt="none"
          color="grape"
          contentEditable={false}
        >
          {name}
        </Badge>
      );
    },
  },
);

export const getCustomShortcutsMenuItems = (
  editor: typeof schema.BlockNoteEditor,
  shortcuts: ICustomShortcutDto[] = [],
): DefaultReactSuggestionItem[] =>
  shortcuts.map((sc) => ({
    title: sc.name,
    icon: <IconBlockquote size={16} />,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'customShortcut',
          props: { id: sc.id },
        },
        ' ',
      ]);
    },
    // eslint-disable-next-line lingui/no-unlocalized-strings
    group: 'Custom Shortcuts',
  }));

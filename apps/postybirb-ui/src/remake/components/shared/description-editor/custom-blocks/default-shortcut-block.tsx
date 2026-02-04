/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import {
  createReactBlockSpec,
  DefaultReactSuggestionItem,
} from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
import { IconTextPlus } from '@tabler/icons-react';
import { useCallback } from 'react';
import './shortcut.css';
import { WebsiteOnlySelector } from './website-only-selector';

export const DefaultShortcut = createReactBlockSpec(
  {
    type: 'defaultShortcut',
    propSchema: {
      only: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const onlyProp = props.block.props.only as string;

      const handleOnlyChange = useCallback(
        (newOnly: string) => {
          props.editor.updateBlock(props.block, {
            props: { only: newOnly },
          });
        },
        [props.editor, props.block]
      );

      return (
        <div
          className="default-shortcut-container"
          style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}
        >
          <Badge
            variant="outline"
            radius="xs"
            tt="none"
            size="sm"
            color="gray"
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
            contentEditable={false}
          >
            <Trans>Default</Trans>
            <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
            <WebsiteOnlySelector only={onlyProp} onOnlyChange={handleOnlyChange} />
          </Badge>
        </div>
      );
    },
  }
);

export const insertDefaultShortcut = (editor: BlockNoteEditor) => ({
  title: 'Default Description',
  onItemClick: () => {
    const currentBlock = editor.getTextCursorPosition().block;
    editor.updateBlock(currentBlock, { type: 'defaultShortcut' } as never);
  },
  aliases: ['default'],
  group: 'Shortcuts',
  icon: <div>📝</div>,
  subtext: 'Inserts default description',
});

/**
 * Creates menu items for the default shortcut in the suggestion menu.
 */
export function getDefaultShortcutMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  isDefaultEditor: boolean
): DefaultReactSuggestionItem[] {
  if (isDefaultEditor) {
    return [];
  }

  return [
    {
      title: 'Default',
      aliases: ['default', 'placeholder', 'description'],
      group: 'Shortcuts',
      icon: <IconTextPlus size={18} />,
      onItemClick: () => {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.updateBlock(currentBlock, {
          type: 'defaultShortcut',
          props: { only: '' },
        } as never);
      },
    },
  ];
}

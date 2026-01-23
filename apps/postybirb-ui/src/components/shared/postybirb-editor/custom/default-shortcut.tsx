/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import { createReactBlockSpec, DefaultReactSuggestionItem } from '@blocknote/react';
import { Badge } from '@mantine/core';
import { IconTextPlus } from '@tabler/icons-react';
import { CommonTranslations } from '../../../../translations/common-translations';

export const DefaultShortcut = createReactBlockSpec(
  {
    type: 'defaultShortcut',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => (
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
        <Badge
          variant="outline"
          radius="xs"
          tt="none"
          size="sm"
          color="gray"
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        >
          <CommonTranslations.Default />
        </Badge>
      </div>
    ),
  },
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
 * Get the Default shortcut menu item for inserting a default description block.
 * Returns an empty array if this is the default editor (to avoid recursion).
 */
export function getDefaultShortcutMenuItem(
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
        editor.updateBlock(currentBlock, { type: 'defaultShortcut' } as never);
      },
    },
  ];
}

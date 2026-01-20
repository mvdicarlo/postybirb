/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { Badge } from '@mantine/core';
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
    editor.replaceBlocks([currentBlock], [{ type: 'defaultShortcut' }] as never);
  },
  aliases: ['default'],
  group: 'Shortcuts',
  icon: <div>📝</div>,
  subtext: 'Inserts default description',
});

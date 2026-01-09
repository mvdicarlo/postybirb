/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';

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
          <Trans>Default</Trans>
        </Badge>
      </div>
    ),
  },
);

export const insertDefaultShortcut = (editor: BlockNoteEditor) => ({
  title: 'Default Description',
  onItemClick: () => {
    editor.insertBlocks(
      [
        {
          type: 'defaultShortcut',
        },
      ] as never,
      editor.getTextCursorPosition().block,
      'before',
    );
  },
  aliases: ['default'],
  group: 'Shortcuts',
  icon: <div>📝</div>,
  subtext: 'Inserts default description',
});

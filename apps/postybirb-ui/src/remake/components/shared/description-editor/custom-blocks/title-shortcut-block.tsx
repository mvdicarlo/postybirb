/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';

export const TitleShortcut = createReactBlockSpec(
  {
    type: 'titleShortcut',
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
          <Trans>Title</Trans>
        </Badge>
      </div>
    ),
  },
);

export const insertTitleShortcut = (editor: BlockNoteEditor) => ({
  title: <Trans>Title</Trans>,
  onItemClick: () => {
    editor.insertBlocks(
      [
        {
          type: 'titleShortcut',
        },
      ] as never,
      editor.getTextCursorPosition().block,
      'before',
    );
  },
  aliases: ['title'],
  group: 'Shortcuts',
  icon: <div>📋</div>,
  subtext: <Trans>Inserts title</Trans>,
});

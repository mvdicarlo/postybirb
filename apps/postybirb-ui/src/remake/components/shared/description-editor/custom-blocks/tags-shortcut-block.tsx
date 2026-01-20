/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';

export const TagsShortcut = createReactBlockSpec(
  {
    type: 'tagsShortcut',
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
          <Trans>Tags</Trans>
        </Badge>
      </div>
    ),
  },
);

export const insertTagsShortcut = (editor: BlockNoteEditor) => ({
  title: <Trans>Tags</Trans>,
  onItemClick: () => {
    editor.insertBlocks(
      [
        {
          type: 'tagsShortcut',
        },
      ] as never,
      editor.getTextCursorPosition().block,
      'before',
    );
  },
  aliases: ['tags'],
  group: 'Shortcuts',
  icon: <div>🏷️</div>,
  subtext: <Trans>Inserts tags</Trans>,
});

/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor, insertOrUpdateBlock } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { Trans } from '@lingui/macro';
import { Badge } from '@mantine/core';

export const DefaultShortcut = createReactBlockSpec(
  {
    type: 'default',
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
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
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
    insertOrUpdateBlock(editor, {
      type: 'default',
    } as never);
  },
  aliases: ['default', 'description'],
  group: 'Shortcuts',
  icon: <div>📝</div>,
});

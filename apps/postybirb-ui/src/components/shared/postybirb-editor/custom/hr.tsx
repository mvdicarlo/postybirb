/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor, insertOrUpdateBlock } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';

export const HR = createReactBlockSpec(
  {
    type: 'hr',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => <hr />,
  },
);

export const insertHr = (editor: BlockNoteEditor) => ({
  title: 'Horizontal Rule',
  onItemClick: () => {
    insertOrUpdateBlock(editor, {
      type: 'hr',
    } as never);
  },
  aliases: ['hr'],
  group: 'Basic blocks',
  icon: <div>-</div>,
  subtext: 'Inserts a horizontal rule',
});

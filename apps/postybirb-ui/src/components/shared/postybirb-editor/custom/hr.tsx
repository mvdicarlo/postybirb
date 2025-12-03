/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor } from '@blocknote/core';
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
    editor.insertBlocks(
      [{
        type: 'hr',
      }] as never,
      editor.getTextCursorPosition().block,
      'after'
    );
  },
  aliases: ['hr'],
  group: 'Basic blocks',
  icon: <div>-</div>,
  subtext: 'Inserts a horizontal rule',
});

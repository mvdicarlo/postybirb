/* eslint-disable lingui/no-unlocalized-strings */
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import {
  BlockNoteView,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from '@blocknote/react';
import '@blocknote/react/style.css';
import { Description } from '@postybirb/types';
import { HR } from './custom/hr';

type PostyBirbEditorProps = {
  value: Description;
  onChange: (newValue: Description) => void;
};

const getModifiedBlockSpecs = () => {
  const blockSpecs: Record<string, unknown> = {
    ...defaultBlockSpecs,
    hr: HR,
  };

  delete blockSpecs.table;
  delete blockSpecs.image;

  return blockSpecs;
};

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...(getModifiedBlockSpecs() as unknown as typeof defaultBlockSpecs),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
  },
});

const insertHr = (editor: typeof schema.BlockNoteEditor) => ({
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

export function PostyBirbEditor(props: PostyBirbEditorProps) {
  const { value, onChange } = props;
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: value?.length ? value : undefined,
    schema,
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      imageToolbar={false}
      tableHandles={false}
      slashMenu={false}
      onChange={() => {
        onChange(editor.document);
        console.log(editor.document);
      }}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          // Gets all default slash menu items and `insertAlert` item.
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertHr(editor)],
            query
          )
        }
      />
    </BlockNoteView>
  );
}

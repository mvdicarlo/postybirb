/* eslint-disable lingui/no-unlocalized-strings */
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView, useCreateBlockNote } from '@blocknote/react';
import '@blocknote/react/style.css';
import { Description } from '@postybirb/types';

type PostyBirbEditorProps = {
  value: Description;
  onChange: (newValue: Description) => void;
};

export function PostyBirbEditor(props: PostyBirbEditorProps) {
  const { value, onChange } = props;
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: value?.length ? value : undefined,
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      imageToolbar={false}
      tableHandles={false}
      onChange={() => {
        onChange(editor.document);
      }}
    />
  );
}

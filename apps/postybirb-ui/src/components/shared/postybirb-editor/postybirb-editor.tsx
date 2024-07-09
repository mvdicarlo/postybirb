/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import {
  BlockNoteView,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from '@blocknote/react';
import '@blocknote/react/style.css';
import { useMantineColorScheme } from '@mantine/core';
import { Description, UsernameShortcut } from '@postybirb/types';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import { insertHr } from './custom/hr';
import { getUsernameShortcutsMenuItems } from './custom/username-shortcut';
import { schema } from './schema';

type PostyBirbEditorProps = {
  value: Description;
  onChange: (newValue: Description) => void;
};

export function PostyBirbEditor(props: PostyBirbEditorProps) {
  const theme = useMantineColorScheme();
  const { value, onChange } = props;
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: value?.length ? value : undefined,
    schema,
  }) as unknown as BlockNoteEditor;

  const { state: websites } = useStore(WebsiteStore);
  const shortcuts: UsernameShortcut[] =
    websites
      ?.filter((w) => w.usernameShortcut)
      .map((w) => w.usernameShortcut as UsernameShortcut) || [];

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      theme={theme.colorScheme === 'light' ? 'light' : 'dark'}
      editor={editor}
      imageToolbar={false}
      tableHandles={false}
      slashMenu={false}
      onChange={() => {
        onChange(editor.document);
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
      <SuggestionMenuController
        // eslint-disable-next-line lingui/text-restrictions
        triggerCharacter="`"
        getItems={async (query) =>
          // Gets the mentions menu items
          filterSuggestionItems(
            getUsernameShortcutsMenuItems(
              editor as unknown as typeof schema.BlockNoteEditor,
              shortcuts
            ),
            query
          )
        }
      />
    </BlockNoteView>
  );
}

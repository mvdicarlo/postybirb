/* eslint-disable lingui/no-unlocalized-strings */
import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from '@blocknote/react';
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
  // TODO - remove media menu
  return (
    <BlockNoteView
      theme={theme.colorScheme === 'light' ? 'light' : 'dark'}
      editor={editor}
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
            query,
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
              shortcuts,
            ),
            query,
          )
        }
      />
    </BlockNoteView>
  );
}

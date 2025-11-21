import { Trans } from "@lingui/react/macro";
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
import { Tooltip, useMantineColorScheme } from '@mantine/core';
import { Description, UsernameShortcut } from '@postybirb/types';
import { IconKeyboard } from '@tabler/icons-react';
import { useMemo } from 'react';
import { CustomShortcutStore } from '../../../stores/custom-shortcut.store';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import { getCustomShortcutsMenuItems } from './custom/custom-shortcut';
import { insertDefaultShortcut } from './custom/default-shortcut';
import { insertHr } from './custom/hr';
import { getUsernameShortcutsMenuItems } from './custom/username-shortcut';
import { schema } from './schema';

type PostyBirbEditorProps = {
  isDefaultEditor: boolean;
  showCustomShortcuts?: boolean;
  value: Description;
  onChange: (newValue: Description) => void;
};

// eslint-disable-next-line lingui/text-restrictions
const shortcutTrigger = '`'; // Backtick character for shortcuts

export function PostyBirbEditor(props: PostyBirbEditorProps) {
  const theme = useMantineColorScheme();
  const {
    isDefaultEditor,
    showCustomShortcuts = true,
    value,
    onChange,
  } = props;
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: value?.length ? (value as never) : undefined,
    schema,
  }) as unknown as BlockNoteEditor;

  const { state: websites } = useStore(WebsiteStore);
  const shortcuts: UsernameShortcut[] =
    websites
      ?.filter((w) => w.usernameShortcut)
      .map((w) => w.usernameShortcut as UsernameShortcut) || [];

  const { state: customShortcuts } = useStore(CustomShortcutStore);

  const suggestions = useMemo(() => {
    const shortcutSuggestions = [
      !isDefaultEditor ? insertDefaultShortcut(editor) : undefined,
      insertHr(editor),
      ...getDefaultReactSlashMenuItems(editor),
    ];

    return shortcutSuggestions.filter((sc) => sc !== undefined);
  }, [editor, isDefaultEditor]);

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '8px',
        border:
          theme.colorScheme === 'dark'
            ? '1.5px solid var(--mantine-color-dark-4)'
            : '1.5px solid var(--mantine-color-gray-3)',
      }}
    >
      <Tooltip
        label={
          <Trans>Type {shortcutTrigger} to insert username shortcuts</Trans>
        }
        position="top-start"
        withArrow
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '4px',
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor:
              theme.colorScheme === 'dark'
                ? 'rgba(0, 0, 0, 0.3)'
                : 'rgba(255, 255, 255, 0.8)',
            fontSize: '12px',
          }}
        >
          <IconKeyboard size={16} />
          <code style={{ fontWeight: 'bold' }}>{shortcutTrigger}</code> for
          shortcuts
        </div>
      </Tooltip>
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
            filterSuggestionItems(suggestions, query)
          }
        />
        <SuggestionMenuController
          triggerCharacter={shortcutTrigger}
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getCustomShortcutsMenuItems(
                  editor as unknown as typeof schema.BlockNoteEditor,
                  customShortcuts || [],
                ),
                ...getUsernameShortcutsMenuItems(
                  editor as unknown as typeof schema.BlockNoteEditor,
                  shortcuts,
                ),
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}

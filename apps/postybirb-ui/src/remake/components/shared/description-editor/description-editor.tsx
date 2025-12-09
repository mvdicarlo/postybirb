/* eslint-disable lingui/text-restrictions */
/* eslint-disable lingui/no-unlocalized-strings */
import {
    BlockNoteSchema,
    defaultBlockSpecs,
    defaultInlineContentSpecs,
    defaultStyleSpecs,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import { Box, useMantineColorScheme } from '@mantine/core';
import type { Description } from '@postybirb/types';
import { useMemo } from 'react';
import { useCustomShortcuts } from '../../../stores/custom-shortcut-store';
import { useWebsites } from '../../../stores/website-store';
import {
    DefaultShortcut,
    filterShortcutMenuItems,
    filterSuggestionItems,
    getCustomShortcutsMenuItems,
    getCustomSlashMenuItems,
    getUsernameShortcutsMenuItems,
    InlineCustomShortcut,
    InlineUsernameShortcut,
} from './custom-blocks';

import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { blockNoteLocaleLanguageMap } from '../../../i18n/languages';
import { useLanguage } from '../../../stores';
import './description-editor.css';

// Shortcut trigger character for username and custom shortcuts
const shortcutTrigger = '`'; // Backtick character

export type DescriptionEditorProps = {
  /**
   * Initial content for the editor.
   */
  value?: Description;

  /**
   * Callback when the editor content changes.
   */
  onChange: (value: Description) => void;

  /**
   * Whether this is the default editor (hides certain options).
   */
  isDefaultEditor?: boolean;

  /**
   * Whether to show the custom shortcuts menu.
   */
  showCustomShortcuts?: boolean;

  /**
   * Minimum height of the editor.
   */
  minHeight?: number;
};

/**
 * BlockNote-based description editor with custom shortcuts support.
 */
export function DescriptionEditor({
  value,
  onChange,
  isDefaultEditor = false,
  showCustomShortcuts = true,
  minHeight = 100,
}: DescriptionEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const { t } = useLingui();
  const customShortcuts = useCustomShortcuts();
  const websites = useWebsites();
  const locale = useLanguage();
  // Create the schema with custom blocks
  const schema = useMemo(
    () =>
      BlockNoteSchema.create({
        blockSpecs: {
          paragraph: defaultBlockSpecs.paragraph,
          heading: defaultBlockSpecs.heading,
          divider: defaultBlockSpecs.divider,
          audio: defaultBlockSpecs.audio,
          video: defaultBlockSpecs.video,
          image: defaultBlockSpecs.image,
          table: defaultBlockSpecs.table,
          defaultShortcut: DefaultShortcut(),
        },
        inlineContentSpecs: {
          ...defaultInlineContentSpecs,
          customShortcut: InlineCustomShortcut,
          username: InlineUsernameShortcut,
        },
        styleSpecs: defaultStyleSpecs,
      }),
    [],
  );

  // Create the editor instance
  const lang = blockNoteLocaleLanguageMap[locale];
  const editor = useCreateBlockNote({
    schema,
    initialContent: value && value.length > 0 ? (value as never) : undefined,
    dictionary: {
      ...lang,
      placeholders: {
        ...lang.placeholders,
        emptyDocument: t`Type / for commands or \` for shortcuts`,
        default: t`Type / for commands or \` for shortcuts`,
      },
    },
  });

  // Get username shortcuts from websites
  const usernameShortcuts = useMemo(
    () =>
      websites
        .map((w) => w.usernameShortcut)
        .filter((shortcut): shortcut is NonNullable<typeof shortcut> =>
          Boolean(shortcut),
        ),
    [websites],
  );

  return (
    <Box
      style={{ minHeight, height: '100%' }}
      className="description-editor-container"
    >
      <BlockNoteView
        theme={colorScheme === 'light' ? 'light' : 'dark'}
        editor={editor}
        tableHandles={false}
        slashMenu={false}
        onChange={() => {
          onChange(editor.document as Description);
        }}
      >
        {/* Slash menu for block insertion */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              getCustomSlashMenuItems(editor, isDefaultEditor),
              query,
            )
          }
        />

        {/* Shortcut menu for username and custom shortcuts */}
        <SuggestionMenuController
          triggerCharacter={shortcutTrigger}
          getItems={async (query) => {
            const items = [
              ...(showCustomShortcuts
                ? getCustomShortcutsMenuItems(editor, customShortcuts)
                : []),
              ...getUsernameShortcutsMenuItems(editor, usernameShortcuts),
            ];
            return filterShortcutMenuItems(items, query);
          }}
        />
      </BlockNoteView>
    </Box>
  );
}

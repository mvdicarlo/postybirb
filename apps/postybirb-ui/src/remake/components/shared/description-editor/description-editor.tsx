/* eslint-disable lingui/text-restrictions */
/* eslint-disable lingui/no-unlocalized-strings */
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  Dictionary,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import { Box, useMantineColorScheme } from '@mantine/core';
import type { Description } from '@postybirb/types';
import { useMemo } from 'react';
import { useLocale } from '../../../hooks';
import { useCustomShortcuts } from '../../../stores/entity/custom-shortcut-store';
import { useWebsites } from '../../../stores/entity/website-store';
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
import { TagsShortcut } from './custom-blocks/tags-shortcut-block';
import { TitleShortcut } from './custom-blocks/title-shortcut-block';
import './description-editor.css';

// Shortcut trigger character for username and custom shortcuts
const shortcutTrigger = '`'; // Backtick character

export type SlashMenuShortcutsConfig = {
  /**
   * Show Default shortcut in slash menu.
   * @default true
   */
  default?: boolean;

  /**
   * Show Title shortcut in slash menu.
   * @default true
   */
  title?: boolean;

  /**
   * Show Tags shortcut in slash menu.
   * @default true
   */
  tags?: boolean;
};

export type ShortcutVisibilityConfig = {
  /**
   * Show user-defined custom shortcuts in the backtick menu.
   * @default true
   */
  customShortcuts?: boolean;

  /**
   * Show username shortcuts in the backtick menu.
   * @default true
   */
  usernameShortcuts?: boolean;

  /**
   * Controls which slash menu shortcuts are shown.
   * - `true`: Show all slash menu shortcuts
   * - `false`: Hide all slash menu shortcuts
   * - `object`: Fine-grained control over each slash menu shortcut
   * @default true
   */
  slashMenuShortcuts?: boolean | SlashMenuShortcutsConfig;
};

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
   * Controls which shortcuts are shown in the backtick menu.
   * - `true`: Show all shortcuts
   * - `false`: Hide all shortcuts
   * - `object`: Fine-grained control over each shortcut type
   */
  showCustomShortcuts?: boolean | ShortcutVisibilityConfig;

  /**
   * Minimum height of the editor.
   */
  minHeight?: number;
};

/**
 * Inner editor component that creates the BlockNote instance.
 * Separated to allow remounting when locale changes.
 */
function DescriptionEditorInner({
  value,
  onChange,
  isDefaultEditor = false,
  showCustomShortcuts,
  minHeight,
  blockNoteLocale,
}: DescriptionEditorProps & { blockNoteLocale: Record<string, unknown> }) {
  const { colorScheme } = useMantineColorScheme();
  const { t } = useLingui();
  const customShortcuts = useCustomShortcuts();
  const websites = useWebsites();

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
          tagsShortcut: TagsShortcut(),
          titleShortcut: TitleShortcut(),
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
  const editor = useCreateBlockNote({
    schema,
    initialContent: value && value.length > 0 ? (value as never) : undefined,
    dictionary: {
      ...blockNoteLocale,
      placeholders: {
        ...(blockNoteLocale.placeholders as Record<string, string>),
        emptyDocument: t`Type / for commands or \` for shortcuts`,
        default: t`Type / for commands or \` for shortcuts`,
      },
    } as unknown as Dictionary,
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
          getItems={async (query) => {
            // Resolve slash menu shortcuts config
            // When isDefaultEditor is true, only hide the default shortcut
            let slashMenuConfig: boolean | SlashMenuShortcutsConfig;

            if (typeof showCustomShortcuts === 'boolean') {
              if (!showCustomShortcuts) {
                slashMenuConfig = false;
              } else if (isDefaultEditor) {
                slashMenuConfig = { default: false, title: true, tags: true };
              } else {
                slashMenuConfig = true;
              }
            } else if (isDefaultEditor) {
              // Merge with user config, but always disable default for default editor
              const userConfig = showCustomShortcuts?.slashMenuShortcuts;
              if (typeof userConfig === 'boolean') {
                slashMenuConfig = userConfig
                  ? { default: false, title: true, tags: true }
                  : false;
              } else {
                slashMenuConfig = {
                  default: false,
                  title: userConfig?.title ?? true,
                  tags: userConfig?.tags ?? true,
                };
              }
            } else {
              slashMenuConfig = showCustomShortcuts?.slashMenuShortcuts ?? true;
            }

            return filterSuggestionItems(
              getCustomSlashMenuItems(editor, slashMenuConfig),
              query,
            );
          }}
        />

        {/* Shortcut menu for username and custom shortcuts */}
        <SuggestionMenuController
          triggerCharacter={shortcutTrigger}
          getItems={async (query) => {
            // Resolve shortcut visibility config
            const showCustom =
              typeof showCustomShortcuts === 'boolean'
                ? showCustomShortcuts
                : showCustomShortcuts?.customShortcuts ?? true;
            const showUsername =
              typeof showCustomShortcuts === 'boolean'
                ? showCustomShortcuts
                : showCustomShortcuts?.usernameShortcuts ?? true;

            const items = [
              ...(showCustom
                ? getCustomShortcutsMenuItems(editor, customShortcuts)
                : []),
              ...(showUsername
                ? getUsernameShortcutsMenuItems(editor, usernameShortcuts)
                : []),
            ];
            return filterShortcutMenuItems(items, query);
          }}
        />
      </BlockNoteView>
    </Box>
  );
}

/**
 * BlockNote-based description editor with custom shortcuts support.
 * Wraps the inner editor with a key to force remount on locale change.
 */
export function DescriptionEditor(props: DescriptionEditorProps) {
  const { locale, blockNoteLocale } = useLocale();

  return (
    <DescriptionEditorInner
      key={locale}
      {...props}
      blockNoteLocale={blockNoteLocale}
    />
  );
}

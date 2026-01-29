/* eslint-disable lingui/text-restrictions */
/* eslint-disable lingui/no-unlocalized-strings */
import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Tooltip, useMantineColorScheme } from '@mantine/core';
import { Description, UsernameShortcut } from '@postybirb/types';
import { IconKeyboard } from '@tabler/icons-react';
import { CustomShortcutStore } from '../../../stores/custom-shortcut.store';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import {
  getCustomShortcutsMenuItems,
  InlineCustomShortcut,
} from './custom/custom-shortcut';
import {
  DefaultShortcut,
  getDefaultShortcutMenuItem,
} from './custom/default-shortcut';
import {
  getSystemShortcutsMenuItems,
  InlineContentWarningShortcut,
  InlineTagsShortcut,
  InlineTitleShortcut,
} from './custom/inline-system-shortcuts';
import {
  getUsernameShortcutsMenuItems,
  InlineUsernameShortcut,
} from './custom/username-shortcut';
import { filterSuggestionItems } from './filter-suggestion-item';

type PostyBirbEditorProps = {
  isDefaultEditor: boolean;
  showCustomShortcuts?: boolean;
  value: Description;
  onChange: (newValue: Description) => void;
};

// Shortcut trigger characters for username and custom shortcuts
const shortcutTriggers = ['@', '`', '{'];

export const getCustomSlashMenuItems = (
  editor: BlockNoteEditor,
): DefaultReactSuggestionItem[] => {
  // Step 1: Default items
  const defaultItems = getDefaultReactSlashMenuItems(editor);

  // Step 2: Filter out unwanted items
  return defaultItems.filter((item) => {
    if (item.key === 'table') return false;
    if (item.key === 'emoji') return false;
    return true;
  });
};

export function PostyBirbEditor(props: PostyBirbEditorProps) {
  const theme = useMantineColorScheme();
  const {
    isDefaultEditor,
    showCustomShortcuts = true,
    value,
    onChange,
  } = props;

  const schema = BlockNoteSchema.create({
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
      titleShortcut: InlineTitleShortcut,
      tagsShortcut: InlineTagsShortcut,
      contentWarningShortcut: InlineContentWarningShortcut,
    },
    styleSpecs: {
      ...defaultStyleSpecs,
    },
  });

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
        label={<Trans>Type @, `, or &lbrace; to insert shortcuts</Trans>}
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
          <code style={{ fontWeight: 'bold' }}>@ ` &lbrace;</code> for shortcuts
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
            filterSuggestionItems(getCustomSlashMenuItems(editor), query)
          }
        />
        {shortcutTriggers.map((trigger) => (
          <SuggestionMenuController
            key={trigger}
            triggerCharacter={trigger}
            getItems={async (query) => {
              const items = [
                ...getDefaultShortcutMenuItem(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  editor as any,
                  isDefaultEditor,
                ),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...getSystemShortcutsMenuItems(editor as any),
                ...(showCustomShortcuts
                  ? getCustomShortcutsMenuItems(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      editor as any,
                      customShortcuts || [],
                    )
                  : []),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...getUsernameShortcutsMenuItems(editor as any, shortcuts),
              ];
              const lowerQuery = query.toLowerCase();
              return items.filter(
                (item) =>
                  item.title.toLowerCase().includes(lowerQuery) ||
                  (item.aliases &&
                    item.aliases.some((alias: string) =>
                      alias.toLowerCase().includes(lowerQuery),
                    )),
              );
            }}
          />
        ))}
      </BlockNoteView>
    </div>
  );
}

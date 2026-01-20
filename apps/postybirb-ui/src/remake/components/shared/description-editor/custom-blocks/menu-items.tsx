/* eslint-disable lingui/no-unlocalized-strings */
import type { BlockNoteEditor } from '@blocknote/core';
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react';
import { IconTextPlus } from '@tabler/icons-react';

export type SlashMenuShortcutsConfig = {
  default?: boolean;
  title?: boolean;
  tags?: boolean;
};

/**
 * Get custom slash menu items for the editor.
 * Filters out table and emoji items and adds custom ones.
 */
export function getCustomSlashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  slashMenuShortcuts: boolean | SlashMenuShortcutsConfig = true
): DefaultReactSuggestionItem[] {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  
  // Filter out table and emoji which can be problematic
  const filteredItems = defaultItems.filter((item) => {
    if (item.key === 'table') return false;
    if (item.key === 'emoji') return false;
    return true;
  });

  // Resolve shortcut visibility
  const showDefault =
    typeof slashMenuShortcuts === 'boolean'
      ? slashMenuShortcuts
      : slashMenuShortcuts?.default ?? true;
  const showTitle =
    typeof slashMenuShortcuts === 'boolean'
      ? slashMenuShortcuts
      : slashMenuShortcuts?.title ?? true;
  const showTags =
    typeof slashMenuShortcuts === 'boolean'
      ? slashMenuShortcuts
      : slashMenuShortcuts?.tags ?? true;

  // Add default shortcut item
  if (showDefault) {
    filteredItems.push({
      title: 'Default',
      aliases: ['default', 'placeholder'],
      group: 'Shortcuts',
      icon: <IconTextPlus size={18} />,
      onItemClick: () => {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.replaceBlocks([currentBlock], [{ type: 'defaultShortcut' }]);
      },
    });
  }

  if (showTitle) {
    filteredItems.push({
      title: 'Title',
      aliases: ['title'],
      group: 'Shortcuts',
      icon: <IconTextPlus size={18} />,
      onItemClick: () => {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.replaceBlocks([currentBlock], [{ type: 'titleShortcut' }]);
      },
    });
  }

  if (showTags) {
    filteredItems.push({
      title: 'Tags',
      aliases: ['tags'],
      group: 'Shortcuts',
      icon: <IconTextPlus size={18} />,
      onItemClick: () => {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.replaceBlocks([currentBlock], [{ type: 'tagsShortcut' }]);
      },
    });
  }

  return filteredItems;
}

/**
 * Filter suggestion items by query string.
 * Matches against title and aliases.
 */
export function filterShortcutMenuItems(
  items: DefaultReactSuggestionItem[],
  query: string
): DefaultReactSuggestionItem[] {
  const lowerQuery = query.toLowerCase();
  
  return items.filter((item) => {
    if (item.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    if (item.aliases) {
      return item.aliases.some((alias: string) =>
        alias.toLowerCase().includes(lowerQuery)
      );
    }
    return false;
  });
}

/**
 * Custom filter for suggestion items.
 * Replacement for BlockNote's filterSuggestionItems.
 */
export function filterSuggestionItems(
  items: DefaultReactSuggestionItem[],
  query: string
): DefaultReactSuggestionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const title = item.title?.toLowerCase() ?? '';
    const aliases = item.aliases?.map((a: string) => a.toLowerCase()) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywords = (item as any).keywords?.map((k: string) => k.toLowerCase()) ?? [];

    return (
      title.includes(q) ||
      aliases.some((a: string) => a.includes(q)) ||
      keywords.some((k: string) => k.includes(q))
    );
  });
}

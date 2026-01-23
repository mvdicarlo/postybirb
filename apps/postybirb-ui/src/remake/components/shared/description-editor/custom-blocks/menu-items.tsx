/* eslint-disable lingui/no-unlocalized-strings */
import type { BlockNoteEditor } from '@blocknote/core';
import {
    DefaultReactSuggestionItem,
    getDefaultReactSlashMenuItems,
} from '@blocknote/react';
import { IconTextPlus } from '@tabler/icons-react';

/**
 * Get custom slash menu items for the editor.
 * Filters out table and emoji items and adds custom ones.
 */
export function getCustomSlashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  isDefaultEditor: boolean
): DefaultReactSuggestionItem[] {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  
  // Filter out table and emoji which can be problematic
  const filteredItems = defaultItems.filter((item) => {
    if (item.key === 'table') return false;
    if (item.key === 'emoji') return false;
    return true;
  });

  // Add default shortcut item only for non-default editors
  if (!isDefaultEditor) {
    filteredItems.push({
      title: 'Default',
      aliases: ['default', 'placeholder'],
      group: 'Shortcuts',
      icon: <IconTextPlus size={18} />,
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'defaultShortcut' }],
          editor.getTextCursorPosition().block,
          'after'
        );
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

/* eslint-disable lingui/no-unlocalized-strings */
import type { BlockNoteEditor } from '@blocknote/core';
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react';
import { IconTextPlus } from '@tabler/icons-react';

/**
 * Get custom slash menu items for the editor.
 * Filters out table and emoji items.
 */
export function getCustomSlashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
): DefaultReactSuggestionItem[] {
  const defaultItems = getDefaultReactSlashMenuItems(editor);

  // Filter out table and emoji which can be problematic
  return defaultItems.filter((item) => {
    if (item.key === 'table') return false;
    if (item.key === 'emoji') return false;
    return true;
  });
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
 * Get the Default shortcut menu item for inserting a default description block.
 * Returns an empty array if this is the default editor (to avoid recursion).
 */
export function getDefaultShortcutMenuItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  isDefaultEditor: boolean
): DefaultReactSuggestionItem[] {
  if (isDefaultEditor) {
    return [];
  }

  return [
    {
      title: 'Default',
      aliases: ['default', 'placeholder', 'description'],
      group: 'Shortcuts',
      icon: <IconTextPlus size={18} />,
      onItemClick: () => {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.updateBlock(currentBlock, { type: 'defaultShortcut' });
      },
    },
  ];
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

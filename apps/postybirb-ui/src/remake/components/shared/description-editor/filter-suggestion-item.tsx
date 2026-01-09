import { DefaultReactSuggestionItem } from '@blocknote/react';

/**
 * Replacement for the old `filterSuggestionItems` helper in BlockNote.
 * Filters slash-menu suggestion items based on the user's query.
 */
export function filterSuggestionItems(
  items: DefaultReactSuggestionItem[],
  query: string,
): DefaultReactSuggestionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const title = item.title?.toLowerCase() ?? '';

    const aliases = item.aliases?.map((a: string) => a.toLowerCase()) ?? [];

    const keywords =
      // some versions used item.keywords, not aliases
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item as any).keywords?.map((k: string) => k.toLowerCase()) ?? [];

    return (
      title.includes(q) ||
      aliases.some((a: string) => a.includes(q)) ||
      keywords.some((k: string) => k.includes(q))
    );
  });
}

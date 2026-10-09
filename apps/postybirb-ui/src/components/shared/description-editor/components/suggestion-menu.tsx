/* eslint-disable lingui/no-unlocalized-strings */
import { Box, Text, UnstyledButton } from '@mantine/core';
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';

export interface SuggestionItem {
  title: string;
  icon?: React.ReactNode;
  group?: string;
  aliases?: string[];
  onSelect: () => void;
}

export interface SuggestionMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SuggestionMenuProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
}

/**
 * A Mantine-based dropdown menu used by all suggestion/slash-menu triggers.
 * TipTap's @tiptap/suggestion calls this component and manages its lifecycle.
 */
export const SuggestionMenu = forwardRef<SuggestionMenuRef, SuggestionMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Reset selection when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // Scroll selected item into view
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const selectedEl = container.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command(item);
        }
      },
      [items, command],
    );

    // Expose keyboard handler to TipTap's suggestion plugin
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return null;
    }

    // Group items by their group property
    const groups: { name: string; items: (SuggestionItem & { globalIndex: number })[] }[] = [];
    let globalIndex = 0;
    for (const item of items) {
      const groupName = item.group ?? '';
      let group = groups.find((g) => g.name === groupName);
      if (!group) {
        group = { name: groupName, items: [] };
        groups.push(group);
      }
      group.items.push({ ...item, globalIndex });
      globalIndex++;
    }

    return (
      <Box
        ref={scrollContainerRef}
        style={{
          background: 'var(--mantine-color-body)',
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-md)',
          boxShadow: 'var(--mantine-shadow-md)',
          maxHeight: '300px',
          overflow: 'auto',
          padding: '4px',
          minWidth: '200px',
        }}
      >
        {groups.map((group) => (
          <Box key={group.name}>
            {group.name && (
              <Text size="xs" c="dimmed" fw={600} px="xs" pt="xs" pb={4} tt="uppercase">
                {group.name}
              </Text>
            )}
            {group.items.map((item) => (
              <UnstyledButton
                key={item.globalIndex}
                data-index={item.globalIndex}
                onClick={() => selectItem(item.globalIndex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--mantine-radius-sm)',
                  background:
                    selectedIndex === item.globalIndex
                      ? 'var(--mantine-color-blue-light)'
                      : 'transparent',
                  transition: 'background 0.1s ease',
                }}
              >
                {item.icon && (
                  <Box style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                    {item.icon}
                  </Box>
                )}
                <Text size="sm">{item.title}</Text>
              </UnstyledButton>
            ))}
          </Box>
        ))}
      </Box>
    );
  },
);

SuggestionMenu.displayName = 'SuggestionMenu';

/**
 * Filter suggestion items by query string.
 * Matches against title and aliases.
 */
export function filterSuggestionItems(
  items: SuggestionItem[],
  query: string,
): SuggestionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const title = item.title.toLowerCase();
    const aliases = item.aliases?.map((a) => a.toLowerCase()) ?? [];
    return title.includes(q) || aliases.some((a) => a.includes(q));
  });
}

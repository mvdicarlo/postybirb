/**
 * useTagSearch - Hook for searching tags with provider support.
 * Provides debounced search functionality with caching.
 */

import { useDebouncedCallback } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { useSettings, useTagSearchProvider } from '../../stores/entity/settings-store';
import { TagSearchProvider } from './tag-search-provider';
import { TagSearchProviders } from './tag-search-providers';

export interface UseTagSearchResult {
  /** Current search query value */
  searchValue: string;
  /** Function to update search value */
  onSearchChange: (value: string) => void;
  /** Search results as array of tag strings */
  data: string[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** The active search provider (if any) */
  provider: TagSearchProvider | undefined;
}

/**
 * Hook for tag search with provider support.
 *
 * @param fieldProviderId - Optional provider ID from a field configuration.
 *                          Falls back to user settings if not provided.
 * @returns Search state and handlers
 *
 * @example
 * ```tsx
 * function TagInput() {
 *   const search = useTagSearch();
 *
 *   return (
 *     <TagsInput
 *       data={search.data}
 *       searchValue={search.searchValue}
 *       onSearchChange={search.onSearchChange}
 *     />
 *   );
 * }
 * ```
 */
export function useTagSearch(fieldProviderId?: string): UseTagSearchResult {
  const settings = useSettings();
  const tagSearchProviderSettings = useTagSearchProvider();

  // Determine the provider to use: field-specific or user setting
  const providerId = fieldProviderId ?? tagSearchProviderSettings?.id ?? '';
  const provider: TagSearchProvider | undefined =
    TagSearchProviders[providerId];

  const [data, setData] = useState<string[]>([]);
  const [searchValue, onSearchChange] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  // Debounced search function with 300ms delay
  const debouncedSearch = useDebouncedCallback(
    (query: string) => {
      if (query === '' || !provider) {
        setData([]);
        setIsLoading(false);
        return;
      }

      const currentRequestId = ++requestId.current;

      setIsLoading(true);
      provider.search(query).then((results) => {
        // Only update state if this is the most recent request
        if (currentRequestId === requestId.current) {
          setData(results);
          setIsLoading(false);
        }
      });
    },
    { delay: 300, flushOnUnmount: false },
  );

  // Trigger search when searchValue changes
  useEffect(() => {
    debouncedSearch(searchValue);

    return () => {
      // Invalidate request id on unmount
      requestId.current = -1;
    };
  }, [searchValue, debouncedSearch]);

  return {
    searchValue,
    onSearchChange,
    data,
    isLoading,
    provider,
  };
}

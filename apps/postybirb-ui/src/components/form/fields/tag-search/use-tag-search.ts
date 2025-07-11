import { useDebouncedCallback } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../../../stores/use-settings';
import { TagSearchProvider } from './tag-search-provider';
import { TagSearchProviders } from './tag-search-providers';

export function useTagFieldSearch(fieldProviderId: string | undefined) {
  const { settings } = useSettings();

  const providerId = fieldProviderId ?? settings.tagSearchProvider.id ?? '';
  const provider: TagSearchProvider | undefined =
    TagSearchProviders[providerId];

  const [data, setData] = useState<string[]>([]);
  const [searchValue, onSearchChange] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  // Debounced search function with 300ms delay
  const debouncedSearch = useDebouncedCallback(
    (query: string) => {
      if (query === '' || !provider) return;

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

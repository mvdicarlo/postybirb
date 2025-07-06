import { useDebouncedCallback } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';

export abstract class TagFieldSearchProvider {
  protected abstract searchImplementation(query: string): Promise<string[]>;

  private cache = new Map<string, string[]>();

  async search(query: string): Promise<string[]> {
    const cached = this.cache.get(query);
    if (cached) return cached;

    const result = await this.searchImplementation(query);
    // Don't cache network error requests
    if (result.length !== 0) this.cache.set(query, result);
    return result;
  }

  abstract renderSearchItem(tag: string): React.ReactNode;
}

export function useTagFieldSearch(provider: TagFieldSearchProvider) {
  const [data, setData] = useState<string[]>([]);
  const [searchValue, onSearchChange] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  // Debounced search function with 300ms delay
  const debouncedSearch = useDebouncedCallback(
    (query: string) => {
      if (query === '') return;

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

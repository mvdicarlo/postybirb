/**
 * Tag Search Provider - Base class for tag search functionality.
 * Providers can search external services (like e621) for tag suggestions.
 */

import { TagSearchProviderSettings } from '@postybirb/types';

/**
 * Base class for tag search providers.
 * Implementations provide search and rendering functionality for tag autocomplete.
 */
export abstract class TagSearchProvider {
  /**
   * Cache for search results to avoid repeated API calls.
   * Limited to {@link MAX_CACHE_SIZE} entries with LRU eviction.
   */
  private cache = new Map<string, { date: number; tags: string[] }>();

  /**
   * Maximum number of cached queries before the oldest entry is evicted.
   */
  private static readonly MAX_CACHE_SIZE = 200;

  /**
   * Cache eviction time in milliseconds (default: 1 hour).
   */
  private cacheEvictionTime = 1000 * 60 * 60;

  /**
   * Search for tags matching the query.
   * Results are cached for efficiency.
   */
  async search(query: string): Promise<string[]> {
    const cached = this.cache.get(query);
    if (cached && Date.now() - cached.date < this.cacheEvictionTime) {
      // Move to end for LRU ordering (Map iteration order = insertion order)
      this.cache.delete(query);
      this.cache.set(query, cached);
      return cached.tags;
    }

    try {
      const tags = await this.searchImplementation(query);
      this.cache.set(query, { date: Date.now(), tags });

      // Evict oldest entries if cache exceeds max size
      while (this.cache.size > TagSearchProvider.MAX_CACHE_SIZE) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
        }
      }

      return tags;
    } catch (e) {
      // Don't cache on error
      // eslint-disable-next-line no-console
      console.error(e);
      return [];
    }
  }

  /**
   * Implementation-specific search logic.
   * Override in subclasses to provide actual search functionality.
   */
  protected abstract searchImplementation(query: string): Promise<string[]>;

  /**
   * Render a custom search result item.
   * Override to provide custom rendering for search results.
   * Return null to use default rendering.
   */
  abstract renderSearchItem(
    tag: string,
    settings: TagSearchProviderSettings,
  ): React.ReactNode;
}

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
   */
  private cache = new Map<string, { date: number; tags: string[] }>();

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
      return cached.tags;
    }

    try {
      const tags = await this.searchImplementation(query);
      this.cache.set(query, { date: Date.now(), tags });
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

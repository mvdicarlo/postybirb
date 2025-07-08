import { TagSearchProviderSettings } from '@postybirb/types';

export abstract class TagSearchProvider {
  private cache = new Map<string, { date: number; tags: string[] }>();

  private cacheEvictionTime = 1000 * 60 * 60; // hour

  async search(query: string): Promise<string[]> {
    const cache = this.cache.get(query);
    if (cache && Date.now() - cache.date < this.cacheEvictionTime) {
      return cache.tags;
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

  protected abstract searchImplementation(query: string): Promise<string[]>;

  abstract renderSearchItem(
    tag: string,
    settings: TagSearchProviderSettings,
  ): React.ReactNode;
}

import { TagSearchProviderSettings } from '@postybirb/types';

export abstract class TagSearchProvider {
  private cache = new Map<string, string[]>();

  async search(query: string): Promise<string[]> {
    const cached = this.cache.get(query);
    if (cached) return cached;

    const result = await this.searchImplementation(query);
    // Don't cache network error requests
    if (result.length !== 0) this.cache.set(query, result);
    return result;
  }

  protected abstract searchImplementation(query: string): Promise<string[]>;

  abstract renderSearchItem(
    tag: string,
    settings: TagSearchProviderSettings,
  ): React.ReactNode;
}

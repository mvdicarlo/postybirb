import { e621TagSearchProvider } from '../../../../website-components/e621/e621-tag-search-provider';
import { TagSearchProvider } from './tag-search-provider';

export const TagSearchProviders: Record<string, TagSearchProvider> = {
  e621: e621TagSearchProvider,
};

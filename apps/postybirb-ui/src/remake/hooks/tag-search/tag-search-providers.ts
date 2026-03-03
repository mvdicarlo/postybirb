/**
 * Tag Search Providers Registry.
 * Maps provider IDs to their implementations.
 */

// Import from the legacy location for now - this provider is shared across old/new UI
// Re-export the provider base class from local definition
import { e621TagSearchProvider } from '../../components/website-components/e621/e621-tag-search-provider';
import { TagSearchProvider } from './tag-search-provider';

/**
 * Available tag search providers keyed by their ID.
 */
export const TagSearchProviders: Record<string, TagSearchProvider> = {
  // Cast needed since legacy provider extends different (but compatible) base class
  e621: e621TagSearchProvider as unknown as TagSearchProvider,
};

import { IWebsiteMetadata } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function WebsiteMetadata(metadata: IWebsiteMetadata) {
  return function website(constructor: Class<UnknownWebsite>) {
    const m: IWebsiteMetadata = {
      ...metadata,
      rateLimitScope: metadata.rateLimitScope ?? 'account',
    };
    // Determine default login refresh
    if (!metadata.refreshInterval) {
      // Default (1 hour)
      m.refreshInterval = 60 * 60_000;
    }

    injectWebsiteDecoratorProps(constructor, { metadata: m });
  };
}

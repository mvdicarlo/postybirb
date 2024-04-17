/* eslint-disable no-param-reassign */
import { IWebsiteMetadata } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

export function WebsiteMetadata(metadata: IWebsiteMetadata) {
  return function website(constructor: Class<UnknownWebsite>) {
    const m = { ...metadata };
    // Determine default login refresh
    if (!metadata.refreshInterval) {
      // OAuth (3 hours)
      if (Object.prototype.hasOwnProperty.call(constructor, 'onAuthorize')) {
        m.refreshInterval = 60 * 60_000 * 3;
      }

      // Default (1 hour)
      m.refreshInterval = 60 * 60_000;
    }

    if (!constructor.prototype.tagSupport) {
      constructor.prototype.tagSupport = { supportsTags: false };
    }

    constructor.prototype.metadata = { ...m };
  };
}

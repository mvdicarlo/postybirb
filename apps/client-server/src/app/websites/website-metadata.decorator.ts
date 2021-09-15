import { IWebsiteMetadata } from '@postybirb/website-metadata';

export function WebsiteMetadata(metadata: IWebsiteMetadata) {
  return function (constructor: Function) {
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

    constructor.prototype.metadata = { ...m };
  };
}

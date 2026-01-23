import { Logger } from '@postybirb/logger';
import { IWebsiteData } from '@postybirb/types';
import { WebsiteDataTransformerRegistry } from '../transformers';
import { WebsiteNameMapper } from '../utils/website-name-mapper';
import { LegacyConverterEntity, MinimalEntity } from './legacy-converter-entity';

const logger = Logger('LegacyWebsiteData');

/**
 * Legacy website data entity from PostyBirb Plus.
 * This reads the same legacy account records but extracts and transforms
 * the website-specific data (OAuth tokens, API keys, credentials) into
 * WebsiteData records.
 *
 * Only websites with registered transformers will produce records.
 * Websites using browser cookies for authentication (e.g., FurAffinity)
 * will return null and be skipped.
 */
export class LegacyWebsiteData implements LegacyConverterEntity<IWebsiteData> {
  _id: string;

  created: number;

  lastUpdated: number;

  alias: string;

  website: string;

  data: unknown;

  constructor(data: Partial<LegacyWebsiteData>) {
    Object.assign(this, data);
  }

  async convert(): Promise<MinimalEntity<IWebsiteData> | null> {
    const newWebsiteId = WebsiteNameMapper.map(this.website);

    // Skip accounts for deprecated websites
    if (!newWebsiteId) {
      return null;
    }

    // Only process websites that have a data transformer
    const transformer = WebsiteDataTransformerRegistry.getTransformer(
      this.website,
    );

    if (!transformer) {
      logger.debug(
        `No transformer for website "${this.website}" (account: ${this.alias}). ` +
          'This website likely uses browser cookies for authentication.',
      );
      return null;
    }

    if (!this.data) {
      logger.warn(
        `Account "${this.alias}" (${this.website}) has transformer but no data to transform.`,
      );
      return null;
    }

    const transformedData = transformer.transform(this.data);

    if (!transformedData) {
      logger.warn(
        `Transformer returned null for account "${this.alias}" (${this.website}).`,
      );
      return null;
    }

    return {
      // WebsiteData uses the same ID as the Account (foreign key relationship)
      // eslint-disable-next-line no-underscore-dangle
      id: this._id,
      data: transformedData as Record<string, unknown>,
    };
  }
}

import { IAccount } from '@postybirb/types';
import { WebsiteDataTransformerRegistry } from '../transformers';
import { WebsiteNameMapper } from '../utils/website-name-mapper';
import {
  LegacyConversionResult,
  LegacyConverterEntity,
} from './legacy-converter-entity';

/**
 * Legacy user account entity from PostyBirb Plus
 * Represents a user's account on a specific website
 */
export class LegacyUserAccount implements LegacyConverterEntity<IAccount> {
  _id: string;

  created: number;

  lastUpdated: number;

  alias: string;

  website: string;

  data: unknown; // Website-specific data (stored separately in V4)

  constructor(data: Partial<LegacyUserAccount>) {
    Object.assign(this, data);
  }

  async convert(): Promise<LegacyConversionResult<IAccount>> {
    const newWebsiteId = WebsiteNameMapper.map(this.website);

    // Skip accounts for deprecated websites
    if (!newWebsiteId) {
      return { entity: null };
    }

    // Transform website-specific data if a transformer exists
    let websiteData: Record<string, unknown> | undefined;
    const transformer = WebsiteDataTransformerRegistry.getTransformer(
      this.website,
    );
    if (transformer && this.data) {
      const transformed = transformer.transform(this.data);
      if (transformed) {
        websiteData = transformed as Record<string, unknown>;
      }
    }

    return {
      entity: {
        // eslint-disable-next-line no-underscore-dangle
        id: this._id,
        name: this.alias,
        website: newWebsiteId,
        groups: [], // Groups weren't part of legacy accounts
      },
      websiteData,
    };
  }
}

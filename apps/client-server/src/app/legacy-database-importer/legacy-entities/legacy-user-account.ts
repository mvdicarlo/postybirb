import { IAccount } from '@postybirb/types';
import { WebsiteNameMapper } from '../utils/website-name-mapper';
import {
  LegacyConverterEntity,
  MinimalEntity,
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

  async convert(): Promise<MinimalEntity<IAccount> | null> {
    const newWebsiteId = WebsiteNameMapper.map(this.website);

    // Skip accounts for deprecated websites
    if (!newWebsiteId) {
      return null;
    }

    return {
      // eslint-disable-next-line no-underscore-dangle
      id: this._id,
      name: this.alias,
      website: newWebsiteId,
      groups: [], // Groups weren't part of legacy accounts
    };
  }
}

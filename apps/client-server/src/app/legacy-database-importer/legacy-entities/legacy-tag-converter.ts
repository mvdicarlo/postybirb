import { ITagConverter } from '@postybirb/types';
import { WebsiteNameMapper } from '../utils/website-name-mapper';
import {
  LegacyConversionResult,
  LegacyConverterEntity,
} from './legacy-converter-entity';

/**
 * Legacy tag converter entity from PostyBirb Plus
 * Converts a tag to website-specific tags
 */
export class LegacyTagConverter
  implements LegacyConverterEntity<ITagConverter>
{
  _id: string;

  created: number;

  lastUpdated: number;

  tag: string;

  conversions: Record<string, string>; // Legacy website ID -> converted tag

  constructor(data: Partial<LegacyTagConverter>) {
    Object.assign(this, data);
  }

  async convert(): Promise<LegacyConversionResult<ITagConverter>> {
    const conversionsMap: Record<string, string> = {};
    for (const [legacyWebsiteId, convertedTag] of Object.entries(
      this.conversions,
    )) {
      const newWebsiteId = WebsiteNameMapper.map(legacyWebsiteId);
      if (newWebsiteId) {
        conversionsMap[newWebsiteId] = convertedTag;
      }
    }

    return {
      entity: {
        // eslint-disable-next-line no-underscore-dangle
        id: this._id,
        tag: this.tag,
        convertTo: conversionsMap,
      },
    };
  }
}

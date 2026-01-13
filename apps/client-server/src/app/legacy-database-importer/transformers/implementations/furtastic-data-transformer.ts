import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Furtastic account data structure from PostyBirb Plus
 */
interface LegacyFurtasticAccountData {
  username: string;
  key: string; // API key
}

/**
 * Modern Furtastic account data type
 */
interface FurtasticAccountData {
  username: string;
  key: string;
}

/**
 * Transforms legacy Furtastic account data to modern format.
 * This is a direct passthrough as the structure is identical.
 *
 * Field mappings:
 * - username → username
 * - key → key
 */
export class FurtasticDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyFurtasticAccountData, FurtasticAccountData>
{
  transform(legacyData: LegacyFurtasticAccountData): FurtasticAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have API key to be useful
    if (!legacyData.key) {
      return null;
    }

    return {
      username: legacyData.username ?? '',
      key: legacyData.key,
    };
  }
}

import { BlueskyAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Bluesky account data structure from PostyBirb Plus
 */
interface LegacyBlueskyAccountData {
  username: string;
  password: string;
}

/**
 * Transforms legacy Bluesky account data to modern format.
 * This is a direct passthrough as the structure is identical.
 *
 * Field mappings:
 * - username → username
 * - password → password
 */
export class BlueskyDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyBlueskyAccountData, BlueskyAccountData>
{
  transform(legacyData: LegacyBlueskyAccountData): BlueskyAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have credentials to be useful
    if (!legacyData.username || !legacyData.password) {
      return null;
    }

    return {
      username: legacyData.username,
      password: legacyData.password,
    };
  }
}

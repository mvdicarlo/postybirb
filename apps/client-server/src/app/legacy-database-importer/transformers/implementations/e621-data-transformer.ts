import { E621AccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy e621 account data structure from PostyBirb Plus
 */
interface LegacyE621AccountData {
  username: string;
  key: string; // API key
}

/**
 * Transforms legacy e621 account data to modern format.
 * This is a direct passthrough as the structure is identical.
 *
 * Field mappings:
 * - username → username
 * - key → key
 */
export class E621DataTransformer
  implements LegacyWebsiteDataTransformer<LegacyE621AccountData, E621AccountData>
{
  transform(legacyData: LegacyE621AccountData): E621AccountData | null {
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

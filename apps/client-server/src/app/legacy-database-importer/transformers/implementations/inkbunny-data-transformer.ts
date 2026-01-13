import { InkbunnyAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Inkbunny account data structure from PostyBirb Plus
 */
interface LegacyInkbunnyAccountData {
  username: string;
  sid: string; // Session ID
}

/**
 * Transforms legacy Inkbunny account data to modern format.
 * This is mostly a direct passthrough.
 *
 * Field mappings:
 * - username → username
 * - sid → sid
 * - folders: undefined (will be fetched on login)
 */
export class InkbunnyDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyInkbunnyAccountData, InkbunnyAccountData>
{
  transform(legacyData: LegacyInkbunnyAccountData): InkbunnyAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have session ID to be useful
    if (!legacyData.sid) {
      return null;
    }

    return {
      username: legacyData.username,
      sid: legacyData.sid,
      folders: undefined, // Will be populated on login
    };
  }
}

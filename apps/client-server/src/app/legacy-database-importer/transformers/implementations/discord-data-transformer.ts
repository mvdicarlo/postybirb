import { DiscordAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Discord account data structure from PostyBirb Plus
 */
interface LegacyDiscordAccountData {
  webhook: string;
  serverBoostLevel: number;
  name: string;
  forum: boolean;
}

/**
 * Transforms legacy Discord account data to modern format.
 *
 * Field mappings:
 * - webhook → webhook
 * - serverBoostLevel → serverLevel
 * - forum → isForum
 * - name is not used in modern (account name is stored separately)
 */
export class DiscordDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyDiscordAccountData, DiscordAccountData>
{
  transform(legacyData: LegacyDiscordAccountData): DiscordAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have webhook URL to be useful
    if (!legacyData.webhook) {
      return null;
    }

    return {
      webhook: legacyData.webhook,
      serverLevel: legacyData.serverBoostLevel ?? 0,
      isForum: legacyData.forum ?? false,
    };
  }
}

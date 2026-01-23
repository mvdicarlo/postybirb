import { TelegramAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Telegram account data structure from PostyBirb Plus
 */
interface LegacyTelegramAccountData {
  appId: string; // Note: stored as string in legacy
  appHash: string;
  phoneNumber: string;
}

/**
 * Transforms legacy Telegram account data to modern format.
 *
 * Field mappings:
 * - appId (string) → appId (number)
 * - appHash → appHash
 * - phoneNumber → phoneNumber
 * - session: undefined (must be re-authenticated)
 * - channels: [] (must be re-fetched after login)
 *
 * Note: Legacy Telegram sessions cannot be migrated as they use
 * a different session storage mechanism. Users will need to
 * re-authenticate after import.
 */
export class TelegramDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyTelegramAccountData, TelegramAccountData>
{
  transform(legacyData: LegacyTelegramAccountData): TelegramAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have app credentials to be useful
    if (!legacyData.appId || !legacyData.appHash) {
      return null;
    }

    return {
      appId: parseInt(legacyData.appId, 10),
      appHash: legacyData.appHash,
      phoneNumber: legacyData.phoneNumber ?? '',
      session: undefined, // Cannot migrate session, requires re-auth
      channels: [], // Will be populated after re-authentication
    };
  }
}

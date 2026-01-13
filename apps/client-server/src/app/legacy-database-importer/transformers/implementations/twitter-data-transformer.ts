import { TwitterAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Twitter account data structure from PostyBirb Plus
 */
interface LegacyTwitterAccountData {
  key: string; // Consumer key (API key)
  secret: string; // Consumer secret (API secret)
  oauth_token: string; // Access token
  oauth_token_secret: string; // Access token secret
  screen_name: string; // Username
  user_id: number; // User ID
}

/**
 * Transforms legacy Twitter account data to modern format.
 *
 * Field mappings:
 * - key → apiKey
 * - secret → apiSecret
 * - oauth_token → accessToken
 * - oauth_token_secret → accessTokenSecret
 * - screen_name → screenName
 * - user_id → userId (number to string)
 */
export class TwitterDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyTwitterAccountData, TwitterAccountData>
{
  transform(legacyData: LegacyTwitterAccountData): TwitterAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have OAuth tokens to be useful
    if (!legacyData.oauth_token || !legacyData.oauth_token_secret) {
      return null;
    }

    return {
      apiKey: legacyData.key,
      apiSecret: legacyData.secret,
      accessToken: legacyData.oauth_token,
      accessTokenSecret: legacyData.oauth_token_secret,
      screenName: legacyData.screen_name,
      userId: legacyData.user_id?.toString(),
    };
  }
}

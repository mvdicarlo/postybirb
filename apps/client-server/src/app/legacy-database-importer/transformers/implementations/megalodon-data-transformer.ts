import { MegalodonAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Megalodon account data structure from PostyBirb Plus
 * Used by Mastodon, Pleroma, and Pixelfed
 */
interface LegacyMegalodonAccountData {
  token: string; // Access token
  website: string; // Instance URL (e.g., "mastodon.social")
  username: string;
}

/**
 * Transforms legacy Megalodon-based account data to modern format.
 * This transformer is used for Mastodon, Pleroma, and Pixelfed.
 *
 * Field mappings:
 * - token → accessToken
 * - website → instanceUrl
 * - username → username
 *
 * Note: OAuth client credentials (clientId, clientSecret) are not
 * preserved from legacy. The token should still work, but users
 * may need to re-authenticate if the token expires.
 */
export class MegalodonDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyMegalodonAccountData, MegalodonAccountData>
{
  transform(legacyData: LegacyMegalodonAccountData): MegalodonAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have token and instance to be useful
    if (!legacyData.token || !legacyData.website) {
      return null;
    }

    return {
      accessToken: legacyData.token,
      instanceUrl: this.normalizeInstanceUrl(legacyData.website),
      username: legacyData.username,
      // These are not available from legacy but may be populated on next login
      clientId: undefined,
      clientSecret: undefined,
      displayName: undefined,
      instanceType: undefined,
    };
  }

  /**
   * Normalize instance URL to consistent format (without protocol or trailing slash).
   */
  private normalizeInstanceUrl(url: string): string {
    let normalized = url.trim().toLowerCase();
    normalized = normalized.replace(/^(https?:\/\/)/, '');
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  }
}

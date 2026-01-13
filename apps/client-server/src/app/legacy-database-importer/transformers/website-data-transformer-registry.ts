import { BlueskyDataTransformer } from './implementations/bluesky-data-transformer';
import { CustomDataTransformer } from './implementations/custom-data-transformer';
import { DiscordDataTransformer } from './implementations/discord-data-transformer';
import { E621DataTransformer } from './implementations/e621-data-transformer';
import { FurtasticDataTransformer } from './implementations/furtastic-data-transformer';
import { InkbunnyDataTransformer } from './implementations/inkbunny-data-transformer';
import { MegalodonDataTransformer } from './implementations/megalodon-data-transformer';
import { TelegramDataTransformer } from './implementations/telegram-data-transformer';
import { TwitterDataTransformer } from './implementations/twitter-data-transformer';
import { LegacyWebsiteDataTransformer } from './legacy-website-data-transformer';

/**
 * Registry that maps legacy website names to their data transformers.
 * Only websites with custom login flows that store credentials in WebsiteData
 * need transformers here.
 */
export class WebsiteDataTransformerRegistry {
  private static readonly transformers: Record<
    string,
    LegacyWebsiteDataTransformer
  > = {
    // OAuth/API key websites
    Twitter: new TwitterDataTransformer(),
    Discord: new DiscordDataTransformer(),
    Telegram: new TelegramDataTransformer(),

    // Megalodon-based fediverse websites (all use same transformer)
    Mastodon: new MegalodonDataTransformer(),
    Pleroma: new MegalodonDataTransformer(),
    Pixelfed: new MegalodonDataTransformer(),

    // Direct credential websites
    Bluesky: new BlueskyDataTransformer(),
    Inkbunny: new InkbunnyDataTransformer(),
    e621: new E621DataTransformer(),
    Furtastic: new FurtasticDataTransformer(),

    // Custom webhook website
    Custom: new CustomDataTransformer(),
  };

  /**
   * Get the transformer for a legacy website name.
   * @param legacyWebsiteName The legacy website name (e.g., "Twitter", "Mastodon")
   * @returns The transformer instance, or undefined if no transformer exists
   */
  static getTransformer(
    legacyWebsiteName: string,
  ): LegacyWebsiteDataTransformer | undefined {
    return this.transformers[legacyWebsiteName];
  }

  /**
   * Check if a legacy website has a data transformer.
   * Websites without transformers typically use browser cookies for auth.
   * @param legacyWebsiteName The legacy website name
   */
  static hasTransformer(legacyWebsiteName: string): boolean {
    return legacyWebsiteName in this.transformers;
  }

  /**
   * Get all legacy website names that have transformers.
   */
  static getTransformableWebsites(): string[] {
    return Object.keys(this.transformers);
  }
}

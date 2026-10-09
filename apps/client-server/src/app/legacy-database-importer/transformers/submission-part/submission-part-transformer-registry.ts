import { ArtconomySubmissionPartTransformer } from './implementations/artconomy-submission-part-transformer';
import { AryionSubmissionPartTransformer } from './implementations/aryion-submission-part-transformer';
import { BlueskySubmissionPartTransformer } from './implementations/bluesky-submission-part-transformer';
import { CustomSubmissionPartTransformer } from './implementations/custom-submission-part-transformer';
import { DeviantArtSubmissionPartTransformer } from './implementations/deviant-art-submission-part-transformer';
import { DiscordSubmissionPartTransformer } from './implementations/discord-submission-part-transformer';
import { E621SubmissionPartTransformer } from './implementations/e621-submission-part-transformer';
import { FurAffinitySubmissionPartTransformer } from './implementations/fur-affinity-submission-part-transformer';
import { HentaiFoundrySubmissionPartTransformer } from './implementations/hentai-foundry-submission-part-transformer';
import { InkbunnySubmissionPartTransformer } from './implementations/inkbunny-submission-part-transformer';
import { ItakuSubmissionPartTransformer } from './implementations/itaku-submission-part-transformer';
import { KoFiSubmissionPartTransformer } from './implementations/ko-fi-submission-part-transformer';
import { MegalodonSubmissionPartTransformer } from './implementations/megalodon-submission-part-transformer';
import { MisskeySubmissionPartTransformer } from './implementations/misskey-submission-part-transformer';
import { NewgroundsSubmissionPartTransformer } from './implementations/newgrounds-submission-part-transformer';
import { PatreonSubmissionPartTransformer } from './implementations/patreon-submission-part-transformer';
import { PhilomenaSubmissionPartTransformer } from './implementations/philomena-submission-part-transformer';
import { PicartoSubmissionPartTransformer } from './implementations/picarto-submission-part-transformer';
import { PiczelSubmissionPartTransformer } from './implementations/piczel-submission-part-transformer';
import { PillowfortSubmissionPartTransformer } from './implementations/pillowfort-submission-part-transformer';
import { PixivSubmissionPartTransformer } from './implementations/pixiv-submission-part-transformer';
import { SofurrySubmissionPartTransformer } from './implementations/sofurry-submission-part-transformer';
import { SubscribeStarSubmissionPartTransformer } from './implementations/subscribe-star-submission-part-transformer';
import { TelegramSubmissionPartTransformer } from './implementations/telegram-submission-part-transformer';
import { TumblrSubmissionPartTransformer } from './implementations/tumblr-submission-part-transformer';
import { TwitterSubmissionPartTransformer } from './implementations/twitter-submission-part-transformer';
import { WeasylSubmissionPartTransformer } from './implementations/weasyl-submission-part-transformer';
import { LegacySubmissionPartTransformer } from './legacy-submission-part-transformer';

/**
 * Registry that maps legacy website names to their submission-part transformers.
 * Only websites with registered transformers will have their submission parts imported.
 */
export class SubmissionPartTransformerRegistry {
  private static readonly transformers: Record<
    string,
    LegacySubmissionPartTransformer
  > = {
    Artconomy: new ArtconomySubmissionPartTransformer(),
    Aryion: new AryionSubmissionPartTransformer(),
    Bluesky: new BlueskySubmissionPartTransformer(),
    Custom: new CustomSubmissionPartTransformer(),
    Derpibooru: new PhilomenaSubmissionPartTransformer(),
    DeviantArt: new DeviantArtSubmissionPartTransformer(),
    Discord: new DiscordSubmissionPartTransformer(),
    e621: new E621SubmissionPartTransformer(),
    FurAffinity: new FurAffinitySubmissionPartTransformer(),
    Furbooru: new PhilomenaSubmissionPartTransformer(),
    HentaiFoundry: new HentaiFoundrySubmissionPartTransformer(),
    Inkbunny: new InkbunnySubmissionPartTransformer(),
    Itaku: new ItakuSubmissionPartTransformer(),
    KoFi: new KoFiSubmissionPartTransformer(),
    Manebooru: new PhilomenaSubmissionPartTransformer(),
    Mastodon: new MegalodonSubmissionPartTransformer(),
    MissKey: new MisskeySubmissionPartTransformer(),
    Newgrounds: new NewgroundsSubmissionPartTransformer(),
    Patreon: new PatreonSubmissionPartTransformer(),
    Picarto: new PicartoSubmissionPartTransformer(),
    Piczel: new PiczelSubmissionPartTransformer(),
    Pillowfort: new PillowfortSubmissionPartTransformer(),
    Pixelfed: new MegalodonSubmissionPartTransformer(),
    Pixiv: new PixivSubmissionPartTransformer(),
    Pleroma: new MegalodonSubmissionPartTransformer(),
    SoFurry: new SofurrySubmissionPartTransformer(),
    SubscribeStar: new SubscribeStarSubmissionPartTransformer(),
    SubscribeStarAdult: new SubscribeStarSubmissionPartTransformer(),
    Telegram: new TelegramSubmissionPartTransformer(),
    Tumblr: new TumblrSubmissionPartTransformer(),
    Twitter: new TwitterSubmissionPartTransformer(),
    Weasyl: new WeasylSubmissionPartTransformer(),
  };

  /**
   * Get the transformer for a legacy website name.
   * @param legacyWebsiteName The legacy website name (e.g., "Discord", "FurAffinity")
   * @returns The transformer instance, or undefined if no transformer exists
   */
  static getTransformer(
    legacyWebsiteName: string,
  ): LegacySubmissionPartTransformer | undefined {
    return this.transformers[legacyWebsiteName];
  }

  /**
   * Check if a legacy website has a submission-part transformer.
   */
  static hasTransformer(legacyWebsiteName: string): boolean {
    return legacyWebsiteName in this.transformers;
  }

  /**
   * Get all legacy website names that have submission-part transformers.
   */
  static getSupportedWebsites(): string[] {
    return Object.keys(this.transformers);
  }
}

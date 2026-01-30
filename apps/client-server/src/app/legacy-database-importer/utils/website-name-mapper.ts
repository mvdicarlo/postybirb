/**
 * Maps legacy PostyBirb Plus website names to new PostyBirb V4 website IDs.
 * The website ID in V4 is the value from the @WebsiteMetadata({ name }) decorator.
 * Legacy uses PascalCase names, V4 uses kebab-case IDs.
 */
export class WebsiteNameMapper {
  private static readonly LEGACY_TO_NEW: Record<string, string> = {
    // Direct mappings (kebab-case in V4)
    Artconomy: 'artconomy',
    Aryion: 'aryion',
    Bluesky: 'bluesky',
    Custom: 'custom',
    Derpibooru: 'derpibooru',
    DeviantArt: 'deviant-art',
    Discord: 'discord',
    FurAffinity: 'fur-affinity',
    Furbooru: 'furbooru',
    FurryNetwork: null, // Deprecated - no longer exists in V4
    HentaiFoundry: 'hentai-foundry',
    Inkbunny: 'inkbunny',
    Itaku: 'itaku',
    KoFi: 'ko-fi',
    Manebooru: 'manebooru',
    Mastodon: 'mastodon',
    MissKey: 'mastodon', // MissKey now uses Mastodon implementation
    Newgrounds: 'newgrounds',
    Patreon: 'patreon',
    Picarto: 'picarto',
    Piczel: 'piczel',
    Pillowfort: 'pillowfort',
    Pixelfed: 'pixelfed',
    Pixiv: 'pixiv',
    Pleroma: 'pleroma',
    SoFurry: 'sofurry',
    SubscribeStar: 'subscribe-star',
    SubscribeStarAdult: 'subscribe-star', // Maps to same base (Adult variant handled differently in V4)
    Telegram: 'telegram',
    Tumblr: 'tumblr',
    Twitter: 'twitter',
    Weasyl: 'weasyl',
    e621: 'e621',

    // New websites in V4 that didn't exist in Plus:
    // cara: 'cara',
    // firefish: 'firefish',
    // friendica: 'friendica',
    // gotosocial: 'gotosocial',
    // toyhouse: 'toyhouse',
  };

  /**
   * Map a legacy website name to the new website name
   */
  static map(legacyName: string): string | null {
    return this.LEGACY_TO_NEW[legacyName] || null;
  }

  /**
   * Map multiple legacy website names
   */
  static mapMany(
    legacyNames: string[],
  ): Array<{ legacy: string; new: string | null }> {
    return legacyNames.map((legacy) => ({
      legacy,
      new: this.map(legacy),
    }));
  }

  /**
   * Check if a legacy website name has a mapping
   */
  static hasMapping(legacyName: string): boolean {
    return legacyName in this.LEGACY_TO_NEW;
  }

  /**
   * Get all legacy website names that have mappings
   */
  static getAllLegacyNames(): string[] {
    return Object.keys(this.LEGACY_TO_NEW);
  }

  /**
   * Get all new website names
   */
  static getAllNewNames(): string[] {
    return Array.from(new Set(Object.values(this.LEGACY_TO_NEW)));
  }
}

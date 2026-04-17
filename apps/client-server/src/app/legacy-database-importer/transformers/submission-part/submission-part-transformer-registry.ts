import { DiscordSubmissionPartTransformer } from './implementations/discord-submission-part-transformer';
import { FurAffinitySubmissionPartTransformer } from './implementations/fur-affinity-submission-part-transformer';
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
    Discord: new DiscordSubmissionPartTransformer(),
    FurAffinity: new FurAffinitySubmissionPartTransformer(),
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

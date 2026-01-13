/**
 * Interface for transforming legacy website-specific account data
 * to modern WebsiteData format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LegacyWebsiteDataTransformer<TLegacy = any, TModern = any> {
  /**
   * Transform legacy account data to modern WebsiteData format.
   * @param legacyData The legacy website-specific data from account.data
   * @returns The transformed data for modern WebsiteData.data, or null if transformation fails
   */
  transform(legacyData: TLegacy): TModern | null;
}

/**
 * Base transformer that passes through data unchanged.
 * Useful for websites where the data structure is already compatible.
 */
export class PassthroughTransformer<T = Record<string, unknown>>
  implements LegacyWebsiteDataTransformer<T, T>
{
  transform(legacyData: T): T | null {
    if (!legacyData) {
      return null;
    }
    return { ...legacyData };
  }
}

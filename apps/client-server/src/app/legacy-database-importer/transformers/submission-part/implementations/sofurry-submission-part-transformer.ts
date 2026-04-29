/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class SofurrySubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      // SoFurry uses custom rating: 0=Clean(GENERAL), 1=Mature(ADULT), 2=Adult(EXTREME)
      // Also accept standard lowercase ratings as fallback
      rating: this.convertSofurryRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      category: legacyData.category ?? '',
      type: legacyData.type ?? '',
      privacy: legacyData.privacy ?? '',
      folder: legacyData.folder ?? '',
      allowComments: legacyData.allowComments ?? true,
      allowDownloads: legacyData.allowDownloads ?? true,
      intendedAsAdvertisement: legacyData.intendedAsAdvertisement ?? false,
      markAsWorkInProgress: legacyData.isWip ?? false,
      pixelPerfectDisplay: legacyData.pixelPerfectDisplay ?? false,
    } as IWebsiteFormFields;
  }

  /**
   * SoFurry uses its own rating system:
   * Legacy: 0=Clean, 1=Mature, 2=Adult
   * Modern: GENERAL=Clean, ADULT=Mature, EXTREME=Adult
   */
  private convertSofurryRating(rating: any): string | undefined {
    const sofurryMap: Record<string, string> = {
      '0': 'GENERAL',
      '1': 'ADULT',
      '2': 'EXTREME',
    };
    if (rating != null && sofurryMap[String(rating)]) {
      return sofurryMap[String(rating)];
    }
    // Fallback to standard conversion
    return this.convertRating(rating);
  }
}

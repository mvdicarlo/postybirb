/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class DeviantArtSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any, submissionType: string): IWebsiteFormFields | null {
    if (!legacyData) return null;

    const base: IWebsiteFormFields = {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
    };

    if (submissionType === 'FILE') {
      return {
        ...base,
        // Legacy may store folder IDs as numbers; modern expects strings
        folders: Array.isArray(legacyData.folders)
          ? legacyData.folders.map((f: any) => String(f))
          : [],
        displayResolution: this.mapDisplayResolution(legacyData.displayResolution),
        scraps: legacyData.scraps ?? false,
        disableComments: legacyData.disableComments ?? false,
        allowFreeDownload: legacyData.freeDownload ?? true,
        isMature: legacyData.isMature ?? false,
        noAI: legacyData.noAI ?? true,
        isAIGenerated: legacyData.isAIGenerated ?? false,
        isCreativeCommons: legacyData.isCreativeCommons ?? false,
        isCommercialUse: legacyData.isCommercialUse ?? false,
        allowModifications: legacyData.allowModifications ?? 'no',
      } as IWebsiteFormFields;
    }

    return base;
  }

  /**
   * Map legacy displayResolution (numeric) to modern string values.
   * Legacy uses 0=original, 1=800, 2=1200, 3=1800.
   */
  private mapDisplayResolution(value: any): string {
    const map: Record<string, string> = {
      '0': 'original',
      '1': 'max_800',
      '2': 'max_1200',
      '3': 'max_1800',
    };
    return map[String(value)] ?? 'original';
  }
}

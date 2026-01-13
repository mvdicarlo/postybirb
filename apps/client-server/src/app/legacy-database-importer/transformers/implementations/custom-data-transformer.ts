import { CustomAccountData } from '@postybirb/types';
import { LegacyWebsiteDataTransformer } from '../legacy-website-data-transformer';

/**
 * Legacy Custom account data structure from PostyBirb Plus
 * Note: Legacy has a typo "thumbnaiField" instead of "thumbnailField"
 */
interface LegacyCustomAccountData {
  descriptionField?: string;
  descriptionType?: 'html' | 'text' | 'md' | 'bbcode';
  fileField?: string;
  fileUrl?: string;
  headers: { name: string; value: string }[];
  notificationUrl?: string;
  ratingField?: string;
  tagField?: string;
  thumbnaiField?: string; // Typo in legacy
  titleField?: string;
  altTextField?: string;
}

/**
 * Transforms legacy Custom account data to modern format.
 *
 * Field mappings:
 * - All fields pass through directly
 * - thumbnaiField (typo) → thumbnailField
 */
export class CustomDataTransformer
  implements LegacyWebsiteDataTransformer<LegacyCustomAccountData, CustomAccountData>
{
  transform(legacyData: LegacyCustomAccountData): CustomAccountData | null {
    if (!legacyData) {
      return null;
    }

    // Must have at least file URL to be useful
    if (!legacyData.fileUrl && !legacyData.notificationUrl) {
      return null;
    }

    return {
      descriptionField: legacyData.descriptionField,
      descriptionType: legacyData.descriptionType,
      fileField: legacyData.fileField,
      fileUrl: legacyData.fileUrl,
      headers: legacyData.headers ?? [],
      notificationUrl: legacyData.notificationUrl,
      ratingField: legacyData.ratingField,
      tagField: legacyData.tagField,
      // Fix typo from legacy: thumbnaiField → thumbnailField
      thumbnailField: legacyData.thumbnaiField,
      titleField: legacyData.titleField,
      altTextField: legacyData.altTextField,
    };
  }
}

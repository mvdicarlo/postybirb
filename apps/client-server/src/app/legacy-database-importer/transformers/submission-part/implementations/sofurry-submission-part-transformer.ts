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
      rating: this.convertRating(legacyData.rating),
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
}

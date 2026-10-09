/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

/**
 * Transforms legacy FurAffinity submission part data to modern format.
 *
 * Legacy FurAffinity options:
 *   FILE: { category, disableComments, folders, gender, reupload, scraps, species, theme,
 *           title?, tags, description, rating?, spoilerText?, sources, useThumbnail, autoScale }
 *   NOTIFICATION: { feature, title?, tags, description, rating?, spoilerText?, sources }
 *
 * Modern FurAffinity options:
 *   FILE: { category, disableComments, folders, gender, scraps, species, theme,
 *           title, tags, description, rating, contentWarning }
 *   MESSAGE: { feature, title, tags, description, rating, contentWarning }
 *
 * Dropped fields: reupload, useThumbnail, autoScale (not in modern model)
 */
export class FurAffinitySubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(
    legacyData: any,
    submissionType: string,
  ): IWebsiteFormFields | null {
    if (!legacyData) {
      return null;
    }

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
        category: legacyData.category ?? '1',
        theme: legacyData.theme ?? '1',
        species: legacyData.species ?? '1',
        gender: legacyData.gender ?? '0',
        folders: Array.isArray(legacyData.folders) ? legacyData.folders : [],
        disableComments: legacyData.disableComments ?? false,
        scraps: legacyData.scraps ?? false,
      } as IWebsiteFormFields;
    }

    // NOTIFICATION → MESSAGE
    return {
      ...base,
      feature: legacyData.feature ?? true,
    } as IWebsiteFormFields;
  }
}

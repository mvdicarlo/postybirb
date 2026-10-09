/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class NewgroundsSubmissionPartTransformer extends BaseSubmissionPartTransformer {
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
        category: legacyData.category ?? '',
        nudity: legacyData.nudity,
        violence: legacyData.violence,
        explicitText: legacyData.explicitText,
        adultThemes: legacyData.adultThemes,
        sketch: legacyData.sketch ?? false,
        creativeCommons: legacyData.creativeCommons ?? false,
        commercial: legacyData.commercial ?? false,
        modification: legacyData.modification ?? false,
      } as IWebsiteFormFields;
    }

    return base;
  }
}

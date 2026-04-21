/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class HentaiFoundrySubmissionPartTransformer extends BaseSubmissionPartTransformer {
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
        nudityRating: legacyData.nudityRating ?? '0',
        violenceRating: legacyData.violenceRating ?? '0',
        profanityRating: legacyData.profanityRating ?? '0',
        racismRating: legacyData.racismRating ?? '0',
        sexRating: legacyData.sexRating ?? '0',
        spoilersRating: legacyData.spoilersRating ?? '0',
        media: legacyData.media ?? '',
      } as IWebsiteFormFields;
    }

    return base;
  }
}

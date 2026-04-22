/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class PatreonSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any, submissionType: string): IWebsiteFormFields | null {
    if (!legacyData) return null;

    const base = {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      tiers: Array.isArray(legacyData.tiers) ? legacyData.tiers : [],
      charge: legacyData.charge ?? false,
      schedule: legacyData.schedule,
      teaser: legacyData.teaser ?? '',
    };

    if (submissionType === 'FILE') {
      return {
        ...base,
        allAsAttachment: legacyData.allAsAttachment ?? false,
      } as IWebsiteFormFields;
    }

    return base;
  }
}

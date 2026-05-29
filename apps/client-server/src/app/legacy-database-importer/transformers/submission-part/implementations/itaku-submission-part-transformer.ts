/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class ItakuSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any, submissionType: string): IWebsiteFormFields | null {
    if (!legacyData) return null;

    const base = {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: legacyData.spoilerText ?? '',
      visibility: legacyData.visibility ?? 'PUBLIC',
      folders: Array.isArray(legacyData.folders) ? legacyData.folders : [],
    };

    if (submissionType === 'FILE') {
      return {
        ...base,
        shareOnFeed: legacyData.shareOnFeed ?? true,
      } as IWebsiteFormFields;
    }

    return base;
  }
}

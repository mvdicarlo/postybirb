/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class PixivSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      communityTags: legacyData.communityTags ?? true,
      matureContent: Array.isArray(legacyData.matureContent) ? legacyData.matureContent : [],
      original: legacyData.original ?? true,
      sexual: legacyData.sexual ?? false,
      containsContent: Array.isArray(legacyData.containsContent) ? legacyData.containsContent : [],
      aiGenerated: legacyData.aiGenerated ?? false,
    } as IWebsiteFormFields;
  }
}

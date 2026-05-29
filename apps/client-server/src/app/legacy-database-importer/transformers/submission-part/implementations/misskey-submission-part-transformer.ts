/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class MisskeySubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any, submissionType: string): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      // Modern Misskey model uses 'cw' field, not 'contentWarning'
      cw: legacyData.spoilerText || undefined,
      visibility: legacyData.visibility ?? 'public',
      useTitle: legacyData.useTitle ?? true,
    } as IWebsiteFormFields;
  }
}

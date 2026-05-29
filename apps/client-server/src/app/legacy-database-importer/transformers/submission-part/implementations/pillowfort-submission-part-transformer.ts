/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class PillowfortSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      privacy: legacyData.privacy ?? 'public',
      allowComments: legacyData.allowComments ?? true,
      allowReblogging: legacyData.allowReblogging ?? true,
      useTitle: legacyData.useTitle ?? true,
    } as IWebsiteFormFields;
  }
}

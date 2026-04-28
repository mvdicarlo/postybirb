/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class WeasylSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      category: String(legacyData.category ?? ''),
      // Legacy may store folder ID as a number; modern expects string
      folder: legacyData.folder != null ? String(legacyData.folder) : '',
      critique: legacyData.critique ?? false,
      notify: legacyData.notify ?? true,
    } as IWebsiteFormFields;
  }
}

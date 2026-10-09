/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class PicartoSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      folder: legacyData.folder ?? '',
      visibility: legacyData.visibility ?? 'PUBLIC',
      comments: legacyData.comments ?? 'EVERYONE',
      category: legacyData.category ?? 'Creative',
      softwares: Array.isArray(legacyData.softwares) ? legacyData.softwares : [],
      downloadSource: legacyData.downloadSource ?? true,
    } as IWebsiteFormFields;
  }
}

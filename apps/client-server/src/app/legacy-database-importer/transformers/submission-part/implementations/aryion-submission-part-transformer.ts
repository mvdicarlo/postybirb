/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class AryionSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      // Legacy stores folder as an array path [root, child, grandchild, ...]
      // Modern expects the deepest (last) folder ID
      folder: Array.isArray(legacyData.folder)
        ? legacyData.folder[legacyData.folder.length - 1] ?? ''
        : legacyData.folder ?? '',
      viewPermissions: legacyData.viewPermissions ?? 'ALL',
      commentPermissions: legacyData.commentPermissions ?? 'USER',
      tagPermissions: legacyData.tagPermissions ?? 'USER',
      requiredTag: legacyData.requiredTag ?? '',
      scraps: legacyData.scraps ?? false,
    } as IWebsiteFormFields;
  }
}

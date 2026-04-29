/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

/**
 * Shared transformer for Megalodon-based fediverse websites
 * (Mastodon, Pleroma, Pixelfed).
 * They share the same legacy option structure.
 */
export class MegalodonSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any, submissionType: string): IWebsiteFormFields | null {
    if (!legacyData) return null;

    const base = {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      // Modern Megalodon model uses 'spoilerText' not 'contentWarning'
      spoilerText: legacyData.spoilerText ?? '',
      visibility: legacyData.visibility ?? 'public',
      replyToUrl: legacyData.replyToUrl,
    };

    if (submissionType === 'FILE') {
      return {
        ...base,
        useTitle: legacyData.useTitle ?? true,
      } as IWebsiteFormFields;
    }

    return {
      ...base,
      useTitle: legacyData.useTitle ?? true,
    } as IWebsiteFormFields;
  }
}

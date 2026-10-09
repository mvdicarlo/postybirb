/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

/**
 * Transforms legacy Discord submission part data to modern format.
 *
 * Legacy Discord options:
 *   FILE: { spoiler, useTitle, title?, tags, description, rating?, spoilerText?, sources, useThumbnail, autoScale }
 *   NOTIFICATION: { useTitle, title?, tags, description, rating?, spoilerText?, sources }
 *
 * Modern Discord options:
 *   FILE: { isSpoiler, useTitle, title, tags, description, rating, contentWarning }
 *   MESSAGE: { useTitle, title, tags, description, rating, contentWarning }
 */
export class DiscordSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(
    legacyData: any,
    submissionType: string,
  ): IWebsiteFormFields | null {
    if (!legacyData) {
      return null;
    }

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
        isSpoiler: legacyData.spoiler ?? false,
        useTitle: legacyData.useTitle ?? true,
      } as IWebsiteFormFields;
    }

    // NOTIFICATION → MESSAGE
    return {
      ...base,
      useTitle: legacyData.useTitle ?? true,
    } as IWebsiteFormFields;
  }
}

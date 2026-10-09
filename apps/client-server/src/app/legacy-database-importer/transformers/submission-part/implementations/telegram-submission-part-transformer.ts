/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class TelegramSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      channels: Array.isArray(legacyData.channels)
        ? (legacyData.channels as unknown[])
            .map((e) =>
              // In v4 telegram uses different separator for channelId and accessHash
              typeof e === 'string' ? e.replaceAll('-', '|') : false,
            )
            .filter(Boolean)
        : [],
      silent: legacyData.silent ?? false,
      spoiler: legacyData.spoiler ?? false,
    } as IWebsiteFormFields;
  }
}

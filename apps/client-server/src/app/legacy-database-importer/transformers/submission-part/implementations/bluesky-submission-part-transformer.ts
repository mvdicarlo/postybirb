/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import type { BlueskyFileSubmission } from '../../../../websites/implementations/bluesky/models/bluesky-file-submission';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class BlueskySubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(
    legacyData: any,
    submissionType: string,
  ): IWebsiteFormFields | null {
    if (!legacyData) return null;

    const whoCanReply = legacyData.threadgate;
    const whoCanReplyGlobal = !whoCanReply
      ? ''
      : whoCanReply === 'nobody'
        ? 'nobody'
        : 'configurable';

    let whoCanReplyConfigurable;
    if (whoCanReplyGlobal === 'configurable') {
      whoCanReplyConfigurable = [];
      whoCanReplyConfigurable.push(...(whoCanReply as string).split(','));
    }

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating)!,
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      labelRating: legacyData.label_rating ?? '',
      replyToUrl: legacyData.replyToUrl,
      whoCanReply: whoCanReply ?? '',
      whoCanReplyConfigurable,
      whoCanReplyGlobal,
    } satisfies Partial<BlueskyFileSubmission> as IWebsiteFormFields;
  }
}

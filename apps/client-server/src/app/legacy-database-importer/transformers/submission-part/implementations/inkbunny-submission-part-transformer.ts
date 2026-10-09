/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class InkbunnySubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      // Inkbunny uses its own rating system (numeric strings like '2', '3', '4', '5')
      // not the standard general/mature/adult/extreme. Pass through as-is.
      rating: legacyData.rating,
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      category: legacyData.submissionType,
      blockGuests: legacyData.blockGuests ?? false,
      friendsOnly: legacyData.friendsOnly ?? false,
      notify: legacyData.notify ?? true,
      scraps: legacyData.scraps ?? false,
    } as IWebsiteFormFields;
  }
}

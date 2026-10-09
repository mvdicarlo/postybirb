/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class KoFiSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any, submissionType: string): IWebsiteFormFields | null {
    if (!legacyData) return null;

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
        album: legacyData.album,
        audience: legacyData.audience ?? 'public',
        hiRes: legacyData.hiRes ?? false,
      } as IWebsiteFormFields;
    }

    return {
      ...base,
      album: legacyData.album,
      audience: legacyData.audience ?? 'public',
    } as IWebsiteFormFields;
  }
}

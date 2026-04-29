/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class HentaiFoundrySubmissionPartTransformer extends BaseSubmissionPartTransformer {
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
        category: legacyData.category ?? '',
        nudityRating: String(legacyData.nudityRating ?? '0'),
        violenceRating: String(legacyData.violenceRating ?? '0'),
        profanityRating: String(legacyData.profanityRating ?? '0'),
        racismRating: String(legacyData.racismRating ?? '0'),
        sexRating: String(legacyData.sexRating ?? '0'),
        spoilersRating: String(legacyData.spoilersRating ?? '0'),
        media: String(legacyData.media ?? '0'),
        timeTaken: legacyData.timeTaken ? Number(legacyData.timeTaken) : undefined,
        scraps: legacyData.scraps ?? false,
        disableComments: legacyData.disableComments ?? false,
        // Content checkboxes
        yaoi: legacyData.yaoi ?? false,
        yuri: legacyData.yuri ?? false,
        teen: legacyData.teen ?? false,
        guro: legacyData.guro ?? false,
        furry: legacyData.furry ?? false,
        beast: legacyData.beast ?? false,
        male: legacyData.male ?? false,
        female: legacyData.female ?? false,
        futa: legacyData.futa ?? false,
        other: legacyData.other ?? false,
        scat: legacyData.scat ?? false,
        incest: legacyData.incest ?? false,
        rape: legacyData.rape ?? false,
      } as IWebsiteFormFields;
    }

    return base;
  }
}

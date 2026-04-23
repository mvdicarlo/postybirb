/* eslint-disable @typescript-eslint/no-explicit-any */
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

export class DeviantArtSubmissionPartTransformer extends BaseSubmissionPartTransformer {
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
        folders: Array.isArray(legacyData.folders) ? legacyData.folders : [],
        displayResolution: legacyData.displayResolution ?? 'original',
        scraps: legacyData.scraps ?? false,
        disableComments: legacyData.disableComments ?? false,
        allowFreeDownload: legacyData.freeDownload ?? true,
        isMature: legacyData.isMature ?? false,
        noAI: legacyData.noAI ?? true,
        isAIGenerated: legacyData.isAIGenerated ?? false,
        isCreativeCommons: legacyData.isCreativeCommons ?? false,
        isCommercialUse: legacyData.isCommercialUse ?? false,
        allowModifications: legacyData.allowModifications ?? 'no',
      } as IWebsiteFormFields;
    }

    return base;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@postybirb/logger';
import { IWebsiteFormFields } from '@postybirb/types';
import { BaseSubmissionPartTransformer } from '../legacy-submission-part-transformer';

const logger = Logger('TumblrSubmissionPartTransformer');

export class TumblrSubmissionPartTransformer extends BaseSubmissionPartTransformer {
  transform(legacyData: any): IWebsiteFormFields | null {
    if (!legacyData) return null;

    // Legacy stored blog by name (e.g. "pbtest"), modern uses Tumblr's UUID
    // (e.g. "t:VYJrXS7zE1zaAlJqpMf6ng"). The UUID is only available after
    // the account logs in, so we cannot resolve it at import time.
    // The blog field will need to be re-selected by the user after logging in.
    if (legacyData.blog) {
      logger.warn(
        `Tumblr blog "${legacyData.blog}" cannot be mapped to a UUID during import. ` +
        'The user will need to re-select their blog after logging in.',
      );
    }

    return {
      title: legacyData.title ?? '',
      tags: this.convertTags(legacyData.tags),
      description: this.convertDescription(legacyData.description),
      rating: this.convertRating(legacyData.rating),
      contentWarning: this.convertContentWarning(legacyData.spoilerText),
      // Intentionally omitted: blog cannot be mapped from legacy name to modern UUID
      useTitle: legacyData.useTitle ?? true,
    } as IWebsiteFormFields;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@postybirb/logger';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { LegacyDescriptionConverter } from '../../utils/legacy-description-converter';

const logger = Logger('LegacySubmissionPartTransformer');

/**
 * Legacy tag data structure from PostyBirb Plus.
 */
export interface LegacyTagData {
  extendDefault: boolean;
  value: string[];
}

/**
 * Legacy description data structure from PostyBirb Plus.
 */
export interface LegacyDescriptionData {
  overwriteDefault: boolean;
  value: string;
}

/**
 * Interface for transforming legacy submission-part data
 * to modern WebsiteOptions form fields.
 */
export interface LegacySubmissionPartTransformer {
  /**
   * Transform legacy website-specific submission part data to modern form fields.
   * @param legacyData The legacy submission part data
   * @param submissionType The legacy submission type ('FILE' | 'NOTIFICATION')
   * @returns The transformed form fields, or null if transformation fails
   */
  transform(
    legacyData: any,
    submissionType: string,
  ): IWebsiteFormFields | null;
}

/**
 * Mapping of legacy rating values (lowercase) to modern (uppercase).
 */
const RATING_MAP: Record<string, SubmissionRating> = {
  general: SubmissionRating.GENERAL,
  mature: SubmissionRating.MATURE,
  adult: SubmissionRating.ADULT,
  extreme: SubmissionRating.EXTREME,
};

/**
 * Base transformer providing shared conversion logic for legacy submission parts.
 * Handles tags, descriptions (HTML→TipTap JSON), ratings, and content warnings.
 */
export abstract class BaseSubmissionPartTransformer
  implements LegacySubmissionPartTransformer
{
  abstract transform(
    legacyData: any,
    submissionType: string,
  ): IWebsiteFormFields | null;

  /**
   * Convert legacy TagData to modern TagValue.
   * Legacy `extendDefault: true` means "add to defaults" → modern `overrideDefault: false`
   */
  protected convertTags(legacyTags: LegacyTagData | undefined): TagValue {
    if (!legacyTags) {
      return DefaultTagValue();
    }

    return {
      overrideDefault: !legacyTags.extendDefault,
      tags: Array.isArray(legacyTags.value) ? legacyTags.value : [],
    };
  }

  /**
   * Convert legacy rating string (lowercase) to modern SubmissionRating (uppercase).
   */
  protected convertRating(
    legacyRating: string | undefined,
  ): SubmissionRating | undefined {
    if (!legacyRating) {
      return undefined;
    }

    const mapped = RATING_MAP[legacyRating.toLowerCase()];
    if (!mapped) {
      logger.warn(`Unknown legacy rating: "${legacyRating}"`);
      return undefined;
    }

    return mapped;
  }

  /**
   * Convert legacy spoilerText to modern contentWarning.
   */
  protected convertContentWarning(spoilerText: string | undefined): string {
    return spoilerText ?? '';
  }

  /**
   * Convert legacy DescriptionData (HTML) to modern DescriptionValue (TipTap JSON).
   * Legacy `overwriteDefault: true` → modern `overrideDefault: true`.
   * Delegates to the shared LegacyDescriptionConverter utility.
   */
  protected convertDescription(
    legacyDesc: LegacyDescriptionData | undefined,
  ): DescriptionValue {
    if (!legacyDesc) {
      return DefaultDescriptionValue();
    }

    const html = legacyDesc.value || '';
    const description = LegacyDescriptionConverter.convert(html);

    return {
      overrideDefault: legacyDesc.overwriteDefault ?? false,
      description,
    };
  }
}

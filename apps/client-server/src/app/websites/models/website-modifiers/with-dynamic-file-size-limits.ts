import { WebsiteFileOptions } from '@postybirb/types';

export type DynamicFileSizeLimits = WebsiteFileOptions['acceptedFileSizes'];

export interface WithDynamicFileSizeLimits {
  getDynamicFileSizeLimits(): DynamicFileSizeLimits;
}

export function isWithDynamicFileSizeLimits(
  website: unknown,
): website is WithDynamicFileSizeLimits {
  return (
    typeof website === 'object' &&
    website !== null &&
    'getDynamicFileSizeLimits' in website
  );
}

export function getDynamicFileSizeLimits(website: unknown) {
  if (isWithDynamicFileSizeLimits(website)) {
    return website.getDynamicFileSizeLimits();
  }
  return undefined;
}

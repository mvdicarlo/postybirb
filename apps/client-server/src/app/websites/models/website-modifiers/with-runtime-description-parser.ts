import { DescriptionType } from '@postybirb/types';

export interface WithRuntimeDescriptionParser {
  getRuntimeParser(): DescriptionType;
}

export function isWithRuntimeDescriptionParser(
  website: unknown,
): website is WithRuntimeDescriptionParser {
  return (
    typeof website === 'object' &&
    website !== null &&
    'getRuntimeParser' in website
  );
}

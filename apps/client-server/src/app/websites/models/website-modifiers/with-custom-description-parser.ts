import { BaseConverter } from '../../../post-parsers/models/description-node/converters/base-converter';

export interface WithCustomDescriptionParser {
  /**
   * Returns the converter to use for parsing descriptions.
   * The converter should extend BaseConverter and output the desired format.
   */
  getDescriptionConverter(): BaseConverter;
}

export function isWithCustomDescriptionParser(
  website: unknown,
): website is WithCustomDescriptionParser {
  return (
    typeof website === 'object' &&
    website !== null &&
    'getDescriptionConverter' in website
  );
}

import { CustomDescriptionParser } from '../../../post-parsers/description-node';

export interface WithCustomDescriptionParser {
  /**
   * The custom description parser.
   */
  onDescriptionParse: CustomDescriptionParser;

  /**
   * Post-process the description after parsing for any additional modifications.
   */
  onAfterDescriptionParse: (description: string) => string;
}

export function isWithCustomDescriptionParser(
  website: unknown
): website is WithCustomDescriptionParser {
  return (
    typeof website === 'object' &&
    website !== null &&
    'onDescriptionParse' in website &&
    'onAfterDescriptionParse' in website
  );
}

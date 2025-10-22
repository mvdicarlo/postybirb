import { CustomNodeHandler } from '../../../post-parsers/models/description-node/converters/custom-converter';

export interface WithCustomDescriptionParser {
  /**
   * The custom description parser.
   */
  onDescriptionParse: CustomNodeHandler;

  /**
   * Post-process the description after parsing for any additional modifications.
   */
  onAfterDescriptionParse: (description: string) => string;
}

export function isWithCustomDescriptionParser(
  website: unknown,
): website is WithCustomDescriptionParser {
  return (
    typeof website === 'object' &&
    website !== null &&
    'onDescriptionParse' in website &&
    'onAfterDescriptionParse' in website
  );
}

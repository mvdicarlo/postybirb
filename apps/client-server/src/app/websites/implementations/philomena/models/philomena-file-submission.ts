import {
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

/**
 * Base file submission options for Philomena-based sites.
 * Subclasses can override field decorators to customize validation.
 */
export class PhilomenaFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
  })
  description: DescriptionValue;

  @TagField({
    minTags: 3,
    spaceReplacer: ' ',
    minTagLength: 1,
    maxTagLength: 100,
  })
  tags: TagValue;
}

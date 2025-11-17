import { DescriptionField, TagField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DerpibooruFileSubmission extends BaseWebsiteOptions {
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

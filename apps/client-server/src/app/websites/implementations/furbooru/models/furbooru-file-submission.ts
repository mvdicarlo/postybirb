import { DescriptionField, TagField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurbooruFileSubmission extends BaseWebsiteOptions {
  @TagField({
    minTags: 5,
  })
  tags: TagValue;

  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
  })
  description: DescriptionValue;
}

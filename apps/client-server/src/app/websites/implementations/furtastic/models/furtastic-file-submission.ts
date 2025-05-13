import { DescriptionField, TagField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurtasticFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
  })
  description: DescriptionValue;

  @TagField({
    col: 1,
    row: 1,
    minTags: 1,
  })
  tags: TagValue;
}

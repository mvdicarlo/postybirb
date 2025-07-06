import { DescriptionField, TagField, TextField } from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class E621FileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  description: DescriptionValue;

  @TagField({
    col: 1,
    row: 1,
    minTags: 4,
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  @TextField({
    label: 'parentId',
  })
  parentId?: string;
}

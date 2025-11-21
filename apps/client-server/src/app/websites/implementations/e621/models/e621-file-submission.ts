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
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue;

  @TagField({
    minTags: 4,
    spaceReplacer: '_',
    searchProviderId: 'e621',
  })
  tags: TagValue = DefaultTagValue();

  @TextField({
    label: 'parentId',
    section: 'website',
    span: 12,
  })
  parentId?: string;
}

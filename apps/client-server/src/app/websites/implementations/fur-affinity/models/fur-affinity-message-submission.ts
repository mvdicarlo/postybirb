import {
  BooleanField,
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurAffinityMessageSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 60 })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @TagField({
    hidden: true,
  })
  tags: TagValue = DefaultTagValue();

  @BooleanField({
    section: 'website',
    span: 6,
    label: 'feature',
    defaultValue: true,
  })
  feature: boolean;
}

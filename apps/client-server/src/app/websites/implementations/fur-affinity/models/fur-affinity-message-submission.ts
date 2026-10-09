import {
  BooleanField,
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurAffinityMessageSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 60 })
  declare title: string;

  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  declare description: DescriptionValue;

  @TagField({
    hidden: true,
  })
  declare tags: TagValue;

  @BooleanField({
    section: 'website',
    span: 6,
    label: 'feature',
    defaultValue: true,
  })
  feature: boolean;
}

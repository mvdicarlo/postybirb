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
  title: string;

  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue;

  @TagField({
    hidden: true,
  })
  tags: TagValue;

  @BooleanField({ col: 1, label: 'feature', defaultValue: true })
  feature: boolean;
}

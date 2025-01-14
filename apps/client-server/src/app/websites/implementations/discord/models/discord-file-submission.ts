import {
  BooleanField,
  DescriptionField,
  TagField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DiscordFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
    maxDescriptionLength: 2000,
  })
  description: DescriptionValue;

  @TagField({
    hidden: true,
  })
  tags: TagValue;

  @BooleanField({ label: 'spoiler' })
  isSpoiler = false;

  @BooleanField({ label: 'useTitle' })
  useTitle = true;
}

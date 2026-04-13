import {
  BooleanField,
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DiscordMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
    maxDescriptionLength: 2000,
  })
  description: DescriptionValue;

  @TagField({
    hidden: true,
  })
  tags: TagValue;

  @BooleanField({ label: 'useTitle', section: 'website' })
  useTitle = true;
}

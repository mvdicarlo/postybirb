import { DescriptionField, TagField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TelegramMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
    maxDescriptionLength: 4096,
  })
  description: DescriptionValue;

  @TagField({})
  tags: TagValue;
}

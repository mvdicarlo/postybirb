import { DescriptionField, TagField  } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TelegramMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML
  })
  description: DescriptionValue;

  @TagField({ hidden: true })
  tags: TagValue;
}

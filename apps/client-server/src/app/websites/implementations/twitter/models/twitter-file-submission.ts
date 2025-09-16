import { DescriptionField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TwitterFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML
  })
  description: DescriptionValue;
}

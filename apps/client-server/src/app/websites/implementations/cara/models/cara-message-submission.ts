import { DescriptionField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class CaraMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: 5000,
  })
  description: DescriptionValue;
}

import { BooleanField, DescriptionField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class CaraFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: 5000,
  })
  description: DescriptionValue;

  @BooleanField({
    label: 'addToPortfolio',
  })
  addToPortfolio = false;
}

import { BooleanField, DescriptionField, TagField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, DefaultTagValue } from '@postybirb/types';
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

  @TagField({
    section: 'common',
    order: 3,
    span: 12,
    spaceReplacer: ' ',
  })
  tags: TagValue = DefaultTagValue();
}

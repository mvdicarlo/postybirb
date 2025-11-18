import { DescriptionField, SelectField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { SubscribeStarAccountData } from './subscribe-star-account-data';

export class SubscribeStarFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @SelectField<SubscribeStarAccountData>({
    required: true,
    label: 'accessTiers',
    minSelected: 1,
    allowMultiple: true,
    options: [], // Populated dynamically
    derive: [
      {
        key: 'tiers',
        populate: 'options',
      },
    ],
    span: 12,
  })
  tiers: string[] = [];
}

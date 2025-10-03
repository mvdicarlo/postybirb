import {
  BooleanField,
  DescriptionField,
  SelectField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PatreonFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @SelectField({
    label: 'accessTiers',
    allowMultiple: true,
    options: [], // Populated dynamically
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
  })
  tiers: string[] = ['-1']; // Default to "All"

  // TODO - Date Field
  schedule?: string;

  earlyAccess?: Date;

  @BooleanField({
    label: 'charge',
  })
  charge = false;

  @BooleanField({
    label: 'allAsAttachment',
  })
  allAsAttachment = false;
}

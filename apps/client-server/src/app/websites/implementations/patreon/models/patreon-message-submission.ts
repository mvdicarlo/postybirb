import {
  BooleanField,
  DateTimeField,
  DescriptionField,
  SelectField,
  TextField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PatreonMessageSubmission extends BaseWebsiteOptions {
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

  @TextField({
    label: 'teaser',
  })
  teaser = '';

  @DateTimeField({
    label: 'schedule',
    showTime: true,
    min: new Date(),
  })
  schedule?: string;

  @DateTimeField({
    label: 'earlyAccess',
    showTime: true,
    min: new Date(),
  })
  earlyAccess?: Date;

  @BooleanField({
    label: 'chargePatrons',
  })
  charge = false;
}

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
    span: 12,
  })
  tiers: string[] = [];

  @SelectField({
    label: 'collections',
    allowMultiple: true,
    options: [], // Populated dynamically
    derive: [
      {
        key: 'collections',
        populate: 'options',
      },
    ],
    span: 12,
  })
  collections: string[] = [];

  @TextField({
    label: 'teaser',
    span: 12,
  })
  teaser = '';

  @DateTimeField({
    label: 'schedule',
    showTime: true,
    min: new Date().toISOString(),
    span: 6,
  })
  schedule?: string;

  @DateTimeField({
    label: 'earlyAccess',
    showTime: true,
    min: new Date().toISOString(),
    span: 6,
  })
  earlyAccess?: Date;

  @BooleanField({
    label: 'chargePatrons',
    span: 3,
  })
  charge = false;
}

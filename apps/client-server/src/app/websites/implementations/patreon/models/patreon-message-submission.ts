import {
  BooleanField,
  DateTimeField,
  DescriptionField,
  SelectField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import { DefaultTagValue, DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PatreonMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;
  
  @TagField({
    maxTagLength: 25,
    spaceReplacer: " ",
  })
  tags: TagValue = DefaultTagValue();

  @SelectField({
    label: 'accessTiers',
    minSelected: 1,
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

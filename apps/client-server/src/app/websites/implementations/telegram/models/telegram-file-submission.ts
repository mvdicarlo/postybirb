import {
  BooleanField,
  DescriptionField,
  SelectField,
  TagField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  TagValue,
  TelegramAccountData,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TelegramFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
    expectsInlineTitle: true,
  })
  description: DescriptionValue;

  @TagField({})
  tags: TagValue;

  @SelectField<TelegramAccountData>({
    label: 'channel',
    derive: [{ key: 'channels', populate: 'options' }],
    options: [],
    allowMultiple: true,
    minSelected: 1,
    required: true,
    section: 'website',
    span: 6,
  })
  channels: string[];

  @BooleanField({
    label: 'silent',
    section: 'website',
    span: 12,
  })
  silent = false;

  @BooleanField({
    label: 'spoiler',
    section: 'website',
    span: 12,
  })
  spoiler = false;
}

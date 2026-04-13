import {
  BooleanField,
  DescriptionField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  TagValue,
  TelegramAccountData,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TelegramFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  description: DescriptionValue;

  @TagField({
    expectedInDescription: true,
  })
  tags: TagValue;

  @BooleanField({
    label: 'silent',
    section: 'website',
    span: 6,
  })
  silent = false;

  @BooleanField({
    label: 'spoiler',
    section: 'website',
    span: 6,
  })
  spoiler = false;

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
}

import {
  BooleanField,
  DescriptionField,
  SelectField,
  SelectOptionItem,
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
    descriptionType: DescriptionType.HTML,
    maxDescriptionLength: 4096,
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
  })
  channels: SelectOptionItem[];

  @BooleanField({
    label: 'silent',
  })
  isSilent = false;

  @BooleanField({ label: 'spoiler' })
  isSpoiler = false;
}

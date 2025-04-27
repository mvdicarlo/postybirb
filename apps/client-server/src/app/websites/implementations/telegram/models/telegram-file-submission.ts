import {
  DescriptionField,
  SelectField,
  SelectOption,
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
  })
  description: DescriptionValue;

  @TagField({ hidden: true })
  tags: TagValue;

  @SelectField<TelegramAccountData>({
    label: 'channel',
    derive: [{ key: 'channels', populate: 'options' }],
    options: [],
    required: true,
  })
  channel: SelectOption;
}

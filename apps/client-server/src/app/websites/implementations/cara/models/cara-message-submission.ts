import {
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class CaraMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: 5000,
  })
  description: DescriptionValue;

  @TagField({
    section: 'common',
    order: 3,
    span: 12,
    spaceReplacer: ' ',
    expectedInDescription: true,
  })
  tags: TagValue = DefaultTagValue();

  @TitleField({
    expectedInDescription: true,
  })
  title = '';
}

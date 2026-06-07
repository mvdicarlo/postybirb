import { DescriptionField } from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class HentaiFoundryMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue = DefaultDescriptionValue();
}

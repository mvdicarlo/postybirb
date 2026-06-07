import { DescriptionField, TitleField } from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DeviantArtMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    maxLength: 50,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  description: DescriptionValue = DefaultDescriptionValue();
}

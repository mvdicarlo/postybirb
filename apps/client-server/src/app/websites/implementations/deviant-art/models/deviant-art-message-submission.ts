import { DescriptionField, TitleField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DeviantArtMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    maxLength: 50,
  })
  declare title: string;

  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  declare description: DescriptionValue;
}

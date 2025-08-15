import { DescriptionField, TitleField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DeviantArtMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    maxLength: 50,
  })
  title: string;

  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;
}

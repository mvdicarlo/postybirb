import { DescriptionField, TextField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurAffinityFileSubmission extends BaseWebsiteOptions {
  @TextField({ label: 'title', maxLength: 60 })
  title: string;

  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  description: DescriptionValue;
}

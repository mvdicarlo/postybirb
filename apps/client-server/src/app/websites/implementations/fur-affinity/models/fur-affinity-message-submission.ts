import { BooleanField, TagField, TextField } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurAffinityMessageSubmission extends BaseWebsiteOptions {
  @TextField({ label: 'title', maxLength: 60 })
  title: string;

  @TagField({
    hidden: true,
  })
  tags: TagValue;

  @BooleanField({ label: 'feature', defaultValue: true })
  feature: boolean;
}

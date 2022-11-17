import { RadioField, TextField } from '@postybirb/form-builder';
import { BaseWebsiteOptions, TagValue } from '@postybirb/types';

export class TestMessageSubmission implements BaseWebsiteOptions {
  @TextField({ label: 'Title', defaultValue: undefined })
  title?: string;

  @TextField({ label: 'placeholder', defaultValue: '' })
  tags: TagValue;

  @TextField({ label: 'placeholder', defaultValue: '' })
  description: unknown;

  @RadioField({
    label: 'placeholder',
    defaultValue: '',
    options: [
      {
        value: 'general',
        label: 'General',
      },
      {
        value: 'mature',
        label: 'Mature',
      },
    ],
  })
  rating: unknown;
}

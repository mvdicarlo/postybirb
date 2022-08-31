import { RadioField, TextField } from '@postybirb/form-builder';
import { BaseWebsiteOptions } from '../../../../submission/models/base-website-options';

export class TestMessageSubmission implements BaseWebsiteOptions {
  @TextField({ label: 'Title', defaultValue: undefined })
  title?: string;

  @TextField({ label: 'placeholder', defaultValue: '' })
  tags: unknown;

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

import { BooleanField, RadioField, TextField } from '@postybirb/form-builder';
import FileWebsiteOptions from '../../../../submission/models/file-website-options';

// TODO real model
export class FurAffinityFileSubmission implements FileWebsiteOptions {
  @BooleanField({ label: 'Use thumbnail', defaultValue: true })
  useThumbnail: boolean = true;

  @BooleanField({ label: 'Allow resizing image', defaultValue: true })
  allowResize: boolean = true;

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

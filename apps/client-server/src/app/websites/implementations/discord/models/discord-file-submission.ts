import { BooleanField, RadioField, TextField } from '@postybirb/form-builder';
import { FileWebsiteOptions, TagValue } from '@postybirb/types';

// TODO real model
export class DiscordFileSubmission implements FileWebsiteOptions {
  @BooleanField({ label: 'Use thumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'Allow resizing image', defaultValue: true })
  allowResize = true;

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

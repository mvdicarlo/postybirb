import {
  BooleanField,
  RatingField,
  TextField,
  DescriptionField,
} from '@postybirb/form-builder';
import {
  DescriptionValue,
  FileWebsiteOptions,
  SubmissionRating,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class DiscordFileSubmission implements FileWebsiteOptions {
  @BooleanField({ label: 'Use thumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'Allow resizing image', defaultValue: true })
  allowResize = true;

  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @DescriptionField({
    label: 'Description',
    defaultValue: {
      overrideDefault: false,
      description: '',
    },
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: undefined,
    options: DefaultRatingOptions,
  })
  rating: SubmissionRating;
}

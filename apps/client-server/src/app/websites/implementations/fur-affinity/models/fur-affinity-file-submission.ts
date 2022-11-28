import {
  BooleanField,
  RadioField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  FileWebsiteOptions,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class FurAffinityFileSubmission implements FileWebsiteOptions {
  @BooleanField({ label: 'Use thumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'Allow resizing image', defaultValue: true })
  allowResize = true;

  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue })
  tags: TagValue;

  @TextField({ label: 'Description', defaultValue: '' })
  description: unknown;

  @RadioField({
    label: 'Rating',
    defaultValue: SubmissionRating.GENERAL,
    options: DefaultRatingOptions,
  })
  rating: SubmissionRating;
}

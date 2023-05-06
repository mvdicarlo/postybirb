import {
  BooleanField,
  DescriptionField,
  RatingField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionValue,
  ISubmissionFields,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class TestFileSubmission implements ISubmissionFields {
  @BooleanField({ label: 'Use thumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'Allow resizing image', defaultValue: true })
  allowResize = true;

  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue })
  tags: TagValue;

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

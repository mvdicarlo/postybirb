import {
  BooleanField,
  DescriptionField,
  RatingField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class FurAffinityFileSubmission implements IWebsiteFormFields {
  @BooleanField({ label: 'Use thumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'Allow resizing image', defaultValue: true })
  allowResize = true;

  @TextField({
    label: 'Title',
    defaultValue: '',
    required: true,
    row: 0,
    column: 1,
  })
  title: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue, row: 2, column: 1 })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultDescriptionValue(),
    row: 3,
    column: 1,
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: undefined,
    options: DefaultRatingOptions,
    required: true,
    row: 0,
    column: 0,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}

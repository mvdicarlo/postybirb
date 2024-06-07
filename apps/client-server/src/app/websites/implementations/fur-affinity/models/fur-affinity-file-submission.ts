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
    gridSpan: 12,
  })
  title: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue(), gridSpan: 12 })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultDescriptionValue(),
    gridSpan: 9,
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: undefined,
    options: DefaultRatingOptions,
    required: true,
    gridSpan: 3,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}

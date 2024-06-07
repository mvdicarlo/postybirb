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

export class FurAffinityMessageSubmission implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: '',
    gridSpan: 12,
    maxLength: 124,
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

  @BooleanField({ label: 'Feature', defaultValue: true })
  feature: boolean;
}

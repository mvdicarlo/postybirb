import {
  BooleanField,
  DescriptionField,
  RatingField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  DefaultDescriptionValue,
  DescriptionValue,
  SubmissionRating,
  TagValue,
  DefaultTagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class FurAffinityMessageSubmission implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: '',
    row: 0,
    column: 1,
  })
  title: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue, row: 2, column: 1 })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultDescriptionValue,
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

  @BooleanField({ label: 'Feature', defaultValue: true })
  feature: boolean;
}

import {
  DescriptionField,
  RatingField,
  TextField,
} from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class DiscordMessageSubmission implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: '',
    row: 0,
    column: 1,
  })
  title: string;

  @DescriptionField({
    label: 'Description',
    defaultValue: {
      overrideDefault: false,
      description: '',
    },
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

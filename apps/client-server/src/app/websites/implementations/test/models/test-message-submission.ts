import {
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

export class TestMessageSubmission implements IWebsiteFormFields {
  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultDescriptionValue,
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: undefined,
    options: DefaultRatingOptions,
  })
  rating: SubmissionRating;
}

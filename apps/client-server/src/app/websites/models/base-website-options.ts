import {
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

export class BaseWebsiteOptions implements IWebsiteFormFields {
  @TextField({
    label: 'title',
    required: true,
    col: 1,
    row: 0,
  })
  title = '';

  @TagField({
    col: 1,
    row: 1,
  })
  tags: TagValue = DefaultTagValue();

  @DescriptionField({
    col: 1,
    row: 3,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @RatingField({
    required: true,
    col: 0,
    row: 0,
  })
  rating: SubmissionRating = SubmissionRating.GENERAL;
}

import {
  DescriptionField,
  RatingField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
} from '@postybirb/types';

export class DiscordMessageSubmission implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: '',
    row: 0,
    col: 1,
  })
  title: string;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultDescriptionValue(),
    row: 3,
    col: 1,
  })
  description: DescriptionValue;

  @RatingField({
    required: true,
    row: 0,
    col: 0,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}

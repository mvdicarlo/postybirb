import {
  DescriptionField,
  RatingField,
  TextField,
} from '@postybirb/form-builder';
import {
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
} from '@postybirb/types';

export class DiscordFileSubmission implements IWebsiteFormFields {
  @TextField({ label: 'title', defaultValue: '' })
  title?: string;

  @DescriptionField({})
  description: DescriptionValue;

  @RatingField({})
  rating: SubmissionRating;
}

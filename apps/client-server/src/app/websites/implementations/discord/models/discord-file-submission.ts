import {
  BooleanField,
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
  @BooleanField({ label: 'useThumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'allowResize', defaultValue: true })
  allowResize = true;

  @TextField({ label: 'title', defaultValue: '' })
  title?: string;

  @DescriptionField({})
  description: DescriptionValue;

  @RatingField({})
  rating: SubmissionRating;
}

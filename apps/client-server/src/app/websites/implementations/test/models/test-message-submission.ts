import {
  DescriptionField,
  RatingField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';

export class TestMessageSubmission implements IWebsiteFormFields {
  @TextField({ label: 'title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'tags', defaultValue: DefaultTagValue() })
  tags: TagValue;

  @DescriptionField({})
  description: DescriptionValue;

  @RatingField({})
  rating: SubmissionRating;
}

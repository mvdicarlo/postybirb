import {
  DescriptionField,
  RatingField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';

export class TestFileSubmission implements IWebsiteFormFields {
  @TextField({ label: 'title', defaultValue: '' })
  title?: string;

  @TagField({ maxTags: 10 })
  tags: TagValue;

  @DescriptionField({})
  description: DescriptionValue;

  @RatingField({})
  rating: SubmissionRating;
}

import {
  BooleanField,
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
  @BooleanField({ label: 'useThumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'allowResize', defaultValue: true })
  allowResize = true;

  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ maxTags: 10 })
  tags: TagValue;

  @DescriptionField({})
  description: DescriptionValue;

  @RatingField({})
  rating: SubmissionRating;
}

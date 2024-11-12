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

export class FurAffinityFileSubmission implements IWebsiteFormFields {
  @BooleanField({ label: 'useThumbnail', defaultValue: true })
  useThumbnail = true;

  @BooleanField({ label: 'allowResize', defaultValue: true })
  allowResize = true;

  @TextField({ label: 'title', required: true, row: 0, col: 1 })
  title: string;

  @TagField({ row: 2, col: 1 })
  tags: TagValue;

  @DescriptionField({ row: 3, col: 1 })
  description: DescriptionValue;

  @RatingField({ required: true, row: 0, col: 0 })
  rating: SubmissionRating;
}

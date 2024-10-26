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

export const DefaultWebsiteOptionsObject: IWebsiteFormFields = {
  title: '',
  tags: DefaultTagValue(),
  description: DefaultDescriptionValue(),
  rating: SubmissionRating.GENERAL,
};

export class DefaultWebsiteOptions implements IWebsiteFormFields {
  @TextField({
    label: 'title',
    required: true,
    col: 1,
    row: 0,
  })
  title: string;

  @TagField({
    col: 1,
    row: 1,
  })
  tags: TagValue;

  @TextField({
    label: 'contentWarning',
    defaultValue: '',
    col: 1,
    row: 2,
  })
  contentWarning: string;

  @DescriptionField({
    col: 1,
    row: 3,
  })
  description: DescriptionValue;

  @RatingField({
    required: true,
    col: 0,
    row: 0,
  })
  rating: SubmissionRating;
}

import {
  DescriptionField,
  RatingField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TwitterMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue;

  @RatingField({
    options: [
      {
        label: 'Safe',
        value: SubmissionRating.GENERAL,
      },
      {
        label: 'Sensitive',
        value: SubmissionRating.ADULT,
      },
    ],
  })
  rating: SubmissionRating;
}

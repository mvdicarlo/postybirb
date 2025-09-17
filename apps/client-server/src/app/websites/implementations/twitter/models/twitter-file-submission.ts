import {
  DescriptionField,
  RadioField,
  RatingField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TwitterFileSubmission extends BaseWebsiteOptions {
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

  @RadioField({
    label: 'contentBlur',
    options: [
      {
        label: 'None',
        value: undefined,
      },
      {
        label: 'Other',
        value: 'other',
      },
      {
        label: 'Adult Content',
        value: 'adult_content',
      },
      {
        label: 'Graphic Violence',
        value: 'graphic_violence',
      },
    ],
  })
  contentBlur: undefined | 'other' | 'adult_content' | 'graphical_violence';
}

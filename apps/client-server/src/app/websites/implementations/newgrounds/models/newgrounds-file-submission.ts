import {
  BooleanField,
  RadioField,
  RatingField,
  SelectField,
} from '@postybirb/form-builder';
import { SubmissionRating } from '@postybirb/types';
import { NewgroundsBaseSubmission } from './newgrounds-base-submission';

export type NewgroundsRating = 'a' | 'b' | 'c';

export class NewgroundsFileSubmission extends NewgroundsBaseSubmission {
  @RatingField({
    hidden: true,
  })
  rating: SubmissionRating;

  @SelectField({
    required: true,
    label: 'category',
    section: 'website',
    span: 12,
    options: [
      { value: '4', label: '3D Art' },
      { value: '7', label: 'Comic' },
      { value: '3', label: 'Fine Art' },
      { value: '1', label: 'Illustration' },
      { value: '5', label: 'Pixel Art' },
      { value: '6', label: 'Other' },
    ],
  })
  category: string;

  @RadioField({
    required: true,
    label: 'nudity',
    section: 'website',
    span: 3,
    options: [
      { value: 'c', label: 'None' },
      { value: 'b', label: 'Some' },
      { value: 'a', label: 'Lots' },
    ],
  })
  nudity: NewgroundsRating;

  @RadioField({
    required: true,
    label: 'violence',
    section: 'website',
    span: 3,
    options: [
      { value: 'c', label: 'None' },
      { value: 'b', label: 'Some' },
      { value: 'a', label: 'Lots' },
    ],
  })
  violence: NewgroundsRating;

  @RadioField({
    required: true,
    label: 'explicitText',
    section: 'website',
    span: 3,
    options: [
      { value: 'c', label: 'None' },
      { value: 'b', label: 'Some' },
      { value: 'a', label: 'Lots' },
    ],
  })
  explicitText: NewgroundsRating;

  @RadioField({
    required: true,
    label: 'adultThemes',
    section: 'website',
    span: 3,
    options: [
      { value: 'c', label: 'None' },
      { value: 'b', label: 'Some' },
      { value: 'a', label: 'Lots' },
    ],
  })
  adultThemes: NewgroundsRating;

  @BooleanField({
    label: 'sketch',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  sketch: boolean;

  @BooleanField({
    label: 'isCreativeCommons',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  creativeCommons: boolean;

  @BooleanField({
    label: 'commercial',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  commercial: boolean;

  @BooleanField({
    label: 'modification',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  modification: boolean;
}

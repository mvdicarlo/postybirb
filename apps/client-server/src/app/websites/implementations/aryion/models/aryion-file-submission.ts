import {
  BooleanField,
  DescriptionField,
  RadioField,
  RatingField,
  SelectField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class AryionFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @RatingField({
    required: false,
    hidden: true,
  })
  rating: SubmissionRating;

  @SelectField({
    label: 'folder',
    options: [],
    required: true,
    section: 'website',
    span: 12,
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
  })
  folder = '';

  @RadioField({
    label: 'requiredTag',
    section: 'website',
    span: 3,
    options: [
      { value: '0', label: 'Vore' },
      { value: '1', label: 'Non-Vore' },
    ],
    required: true,
  })
  requiredTag: string;

  @RadioField({
    label: 'commentPermissions',
    section: 'website',
    span: 9,
    options: [
      { value: 'USER', label: 'Registered Users' },
      { value: 'BLACK', label: 'All But Blocked' },
      { value: 'WHITE', label: 'Friends Only' },
      { value: 'SELF', label: 'Self Only' },
      { value: 'NONE', label: 'Nobody' },
    ],
  })
  commentPermissions = 'USER';

  @RadioField({
    label: 'viewPermissions',
    section: 'website',
    span: 6,
    options: [
      { value: 'ALL', label: 'Everyone' },
      { value: 'USER', label: 'Registered Users' },
      { value: 'SELF', label: 'Self Only' },
    ],
  })
  viewPermissions = 'ALL';

  @RadioField({
    label: 'tagPermissions',
    section: 'website',
    span: 6,
    options: [
      { value: 'USER', label: 'Registered Users' },
      { value: 'BLACK', label: 'All But Blocked' },
      { value: 'WHITE', label: 'Friends Only' },
      { value: 'SELF', label: 'Self Only' },
    ],
  })
  tagPermissions = 'USER';

  @BooleanField({
    label: 'scraps',
    section: 'website',
    span: 6,
  })
  scraps = false;
}

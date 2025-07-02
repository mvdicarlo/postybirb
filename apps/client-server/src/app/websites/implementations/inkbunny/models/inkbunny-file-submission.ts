import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class InkbunnyFileSubmission extends BaseWebsiteOptions {
  @RatingField({
    options: [
      {
        value: '2',
        label: 'Nudity',
      },
      {
        value: '3',
        label: 'Violence',
      },
      {
        value: '2,3',
        label: 'Nudity + Violence',
      },
      {
        value: '4',
        label: 'Sexual',
      },
      {
        value: '5',
        label: 'Brutal',
      },
      {
        value: '2,5',
        label: 'Nudity + Brutal',
      },
      {
        value: '3,4',
        label: 'Sexual + Violent',
      },
      {
        value: '4,5',
        label: 'Sexual + Brutal',
      },
    ],
  })
  rating: SubmissionRating;

  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue;

  @TagField({
    minTags: 4,
  })
  tags: TagValue;

  @SelectField({
    label: 'category',
    options: [
      { label: 'Picture/Pinup', value: '1' },
      { label: 'Sketch', value: '2' },
      { label: 'Picture Series', value: '3' },
      { label: 'Comic', value: '4' },
      { label: 'Portfolio', value: '5' },
      { label: 'Shockwave/Flash - Animation', value: '6' },
      { label: 'Shockwave/Flash - Interactive', value: '7' },
      { label: 'Video - Feature Length', value: '8' },
      { label: 'Video - Animation/3D/CGI', value: '9' },
      { label: 'Music - Single Track', value: '10' },
      { label: 'Music - Album', value: '11' },
      { label: 'Writing - Document', value: '12' },
      { label: 'Character Sheet', value: '13' },
      { label: 'Photography - Fursuit/Sculpture/Jewelry/etc', value: '14' },
    ],
  })
  category?: string;

  @BooleanField({
    label: 'blockGuests',
  })
  blockGuests = false;

  @BooleanField({
    label: 'friendsOnly',
  })
  friendsOnly = false;

  @BooleanField({
    label: 'notify',
  })
  notify = true;

  @BooleanField({
    label: 'scraps',
  })
  scraps = false;
}

import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PixivFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    maxLength: 32,
  })
  title: string;

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @TagField({
    maxTags: 10,
  })
  tags: TagValue = DefaultTagValue();

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'All ages' },
      { value: SubmissionRating.MATURE, label: 'R18' },
      { value: SubmissionRating.EXTREME, label: 'R-18G' },
    ],
  })
  rating: SubmissionRating;

  @SelectField({
    label: 'matureContent',
    options: [
      { value: 'yuri', label: 'Yuri' },
      { value: 'bl', label: 'BL' },
      { value: 'furry', label: 'Furry' },
      { value: 'lo', label: 'Lo' },
    ],
    allowMultiple: true,
    showWhen: [
      [
        'rating',
        [
          SubmissionRating.MATURE,
          SubmissionRating.ADULT,
          SubmissionRating.EXTREME,
        ],
      ],
    ],
    col: 1,
  })
  matureContent: string[];

  @SelectField({
    label: 'containsContent',
    options: [
      { value: 'violent', label: 'Violence' },
      { value: 'drug', label: 'References to drugs, alcohol, and smoking' },
      { value: 'thoughts', label: 'Strong language/Sensitive themes' },
      { value: 'antisocial', label: 'Depictions of criminal activity' },
      { value: 'religion', label: 'Religion' },
    ],
    allowMultiple: true,
    col: 1,
  })
  containsContent: string[];

  @BooleanField({
    label: 'allowCommunityTags',
    defaultValue: true,
    col: 1,
  })
  communityTags: boolean;

  @BooleanField({
    label: 'originalWork',
    defaultValue: true,
    col: 1,
  })
  original: boolean;

  @BooleanField({
    label: 'hasSexualContent',
    defaultValue: false,
    showWhen: [['rating', [SubmissionRating.GENERAL]]],
    col: 1,
  })
  sexual: boolean;

  @BooleanField({
    label: 'aIGenerated',
    required: true,
    defaultValue: false,
    col: 1,
  })
  aiGenerated: boolean;
}

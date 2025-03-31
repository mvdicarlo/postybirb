import {
    BooleanField,
    RatingField,
    SelectField,
    TagField,
    TitleField,
} from '@postybirb/form-builder';
import {
    DefaultTagValue,
    DynamicObject,
    SubmissionRating,
    TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PixivFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    maxLength: 32,
  })
  title: string;

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

  @BooleanField({
    label: 'allowCommunityTags',
    defaultValue: true,
  })
  communityTags: boolean;

  @BooleanField({
    label: 'originalWork',
    defaultValue: true,
  })
  original: boolean;

  @BooleanField({
    label: 'hasSexualContent',
    defaultValue: false,
    showWhen: (values: DynamicObject) =>
      values.rating === SubmissionRating.GENERAL,
  })
  sexual: boolean;

  @BooleanField({
    label: 'aIGenerated',
    required: true,
    defaultValue: false,
  })
  aiGenerated: boolean;

  @SelectField({
    label: 'matureContent',
    options: [
      { value: 'yuri', label: 'Yuri' },
      { value: 'bl', label: 'BL' },
      { value: 'furry', label: 'Furry' },
      { value: 'lo', label: 'Lo' },
    ],
    multiple: true,
    showWhen: (values: DynamicObject) =>
      values.rating === SubmissionRating.MATURE ||
      values.rating === SubmissionRating.ADULT ||
      values.rating === SubmissionRating.EXTREME,
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
    multiple: true,
  })
  containsContent: string[];
}

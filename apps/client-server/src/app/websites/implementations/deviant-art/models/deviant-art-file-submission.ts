import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DeviantArtFileSubmission extends BaseWebsiteOptions {
  @RatingField({
    hidden: true,
  })
  rating: SubmissionRating;

  @TitleField({
    maxLength: 50,
  })
  title: string;

  @TagField({
    maxTags: 30,
  })
  tags: TagValue;

  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @SelectField({
    section: 'website',
    span: 6,
    label: 'folder',
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    options: [],
    allowMultiple: true,
  })
  folders: string[] = [];

  @SelectField({
    label: 'displayResolution',
    options: [
      { value: 'original', label: 'Original' },
      { value: 'max_800', label: 'Maximum 800px' },
      { value: 'max_1200', label: 'Maximum 1200px' },
      { value: 'max_1800', label: 'Maximum 1800px' },
    ],
    section: 'website',
    span: 6,
  })
  displayResolution = 'original';

  @BooleanField({
    label: 'scraps',
    section: 'website',
    span: 6,
  })
  scraps = false;

  @BooleanField({
    label: 'disableComments',
    section: 'website',
    span: 6,
  })
  disableComments = false;

  @BooleanField({
    label: 'allowFreeDownload',
    section: 'website',
    span: 6,
  })
  allowFreeDownload = true;

  @BooleanField({
    label: 'matureContent',
    section: 'website',
    span: 6,
  })
  isMature = false;

  @BooleanField({
    label: 'noAI',
    section: 'website',
    span: 6,
  })
  noAI = true;

  @BooleanField({
    label: 'aIGenerated',
    section: 'website',
    span: 6,
  })
  isAIGenerated = false;

  @BooleanField({
    label: 'isCreativeCommons',
    section: 'website',
    span: 6,
  })
  isCreativeCommons = false;

  @BooleanField({
    label: 'allowCommercialUse',
    section: 'website',
    span: 6,
  })
  isCommercialUse = false;

  @SelectField({
    label: 'allowModifications',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'share', label: 'Share Alike' },
      { value: 'no', label: 'No' },
    ],
    section: 'website',
    span: 6,
  })
  allowModifications = 'no';
}

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
  title;

  @TagField({
    maxTags: 30,
  })
  tags: TagValue;

  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @BooleanField({
    label: 'disableComments',
    col: 2,
  })
  disableComments = false;

  @BooleanField({
    label: 'allowFreeDownload',
    col: 2,
  })
  allowFreeDownload = true;

  @SelectField({
    col: 2,
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

  @BooleanField({
    label: 'matureContent',
    col: 2,
  })
  isMature = false;

  @SelectField({
    label: 'displayResolution',
    options: [
      { value: 'original', label: 'Original' },
      { value: 'max_800', label: 'Maximum 800px' },
      { value: 'max_1200', label: 'Maximum 1200px' },
      { value: 'max_1800', label: 'Maximum 1800px' },
    ],
    col: 1,
  })
  displayResolution = 'original';

  @BooleanField({
    label: 'scraps',
    col: 2,
  })
  scraps = false;

  @BooleanField({
    label: 'noAI',
    col: 2,
  })
  noAI = true;

  @BooleanField({
    label: 'aIGenerated',
    col: 2,
  })
  isAIGenerated = false;

  @BooleanField({
    label: 'isCreativeCommons',
    col: 2,
  })
  isCreativeCommons = false;

  @BooleanField({
    label: 'allowCommercialUse',
    col: 2,
  })
  isCommercialUse = false;

  @SelectField({
    label: 'allowModifications',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'share', label: 'Share Alike' },
      { value: 'no', label: 'No' },
    ],
    col: 2,
  })
  allowModifications = 'no';
}

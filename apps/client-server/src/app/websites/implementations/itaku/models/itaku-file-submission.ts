import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { ItakuAccountData } from './itaku-account-data';

export class ItakuFileSubmission extends BaseWebsiteOptions {
  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'General' },
      { value: SubmissionRating.MATURE, label: 'Questionable' },
      { value: SubmissionRating.ADULT, label: 'NSFW' },
    ],
  })
  rating: SubmissionRating;

  @TagField({
    maxTagLength: 59,
    minTags: 5,
  })
  tags: TagValue;

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: 5000,
  })
  description: DescriptionValue;

  @TextField({
    label: 'contentWarning',
    hidden: false,
    maxLength: 30,
  })
  contentWarning = '';

  @SelectField({
    label: 'visibility',
    options: [
      { value: 'PUBLIC', label: 'Public Gallery' },
      { value: 'PROFILE_ONLY', label: 'Profile Only' },
      { value: 'UNLISTED', label: 'Unlisted' },
    ],
    col: 1,
  })
  visibility = 'PUBLIC';

  @SelectField<ItakuAccountData>({
    col: 1,
    label: 'folder',
    derive: [
      {
        key: 'galleryFolders',
        populate: 'options',
      },
    ],
    options: [],
    allowMultiple: true,
  })
  folders: string[];

  @BooleanField({
    label: 'shareOnFeed',
    col: 1,
  })
  shareOnFeed = true;
}

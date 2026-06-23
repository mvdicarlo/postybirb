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
  SofurryAccountData,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import {
  SofurryCategoriesByFileType,
  SofurryPrivacyOptions,
  SofurryTypesByFileType,
} from './sofurry-categories';

export class SofurryFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  declare description: DescriptionValue;

  @TagField({
    minTags: 2,
    maxTags: 100
  })
  declare tags: TagValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'Clean' },
      { value: SubmissionRating.ADULT, label: 'Mature' },
      { value: SubmissionRating.EXTREME, label: 'Adult' },
    ],
  })
  declare rating: SubmissionRating;

  @SelectField<SofurryAccountData>({
    label: 'folder',
    allowMultiple: true,
    options: [],
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    section: 'website',
    span: 12,
  })
  folders: string[] = [];

  @SelectField({
    label: 'category',
    section: 'website',
    span: 6,
    options: {
      options: SofurryCategoriesByFileType,
      discriminator: 'overallFileType',
    },
  })
  category: string;

  @SelectField({
    label: { untranslated: 'Type' },
    section: 'website',
    span: 6,
    options: {
      options: SofurryTypesByFileType,
      discriminator: 'overallFileType',
    },
  })
  type: string;

  @SelectField({
    label: { untranslated: 'Privacy' },
    defaultValue: '3',
    options: SofurryPrivacyOptions,
    section: 'website',
    span: 6,
  })
  privacy: string;

  @BooleanField({
    label: 'allowComments',
    defaultValue: true,
    section: 'website',
    span: 6,
  })
  allowComments: boolean;

  @BooleanField({
    label: 'allowFreeDownload',
    defaultValue: true,
    section: 'website',
    span: 6,
  })
  allowDownloads: boolean;

  @BooleanField({
    label: 'intendedAsAdvertisement',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  intendedAsAdvertisement: boolean;

  @BooleanField({
    label: 'markAsWorkInProgress',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  markAsWorkInProgress: boolean;

  @BooleanField({
    label: 'pixelPerfectDisplay',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  pixelPerfectDisplay: boolean;

  processTag(tag: string): string {
    return tag.replace(/_/g, ' ');
  }
}

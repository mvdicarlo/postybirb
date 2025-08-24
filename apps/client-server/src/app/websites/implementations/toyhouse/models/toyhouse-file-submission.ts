import { BooleanField, DescriptionField, RatingField, SelectField, TagField, TextField, TitleField } from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { ToyhouseAccountData } from './toyhouse-account-data';

const ToyhouseMaturityOptions = [
  { value: SubmissionRating.GENERAL, label: 'No Sexual Content' },
  { value: SubmissionRating.MATURE, label: 'Mild Sexual Content' },
  { value: SubmissionRating.ADULT, label: 'Explicit Sexual Content' },
];

const ToyhousePrivacyOptions = [
  { value: '0', label: 'Full-Size' },
  { value: '1', label: 'Watermarked' },
  { value: '2', label: 'Thumbnail' },
  { value: '3', label: 'Hidden' },
];

const ToyhouseWatermarkOptions = [
  { value: '1', label: 'Default (Center)' },
  { value: '2', label: 'Default (Stretch)' },
  { value: '3', label: 'Default (Tile)' },
  // Custom watermarks are not supported at this time.
];

export class ToyhouseFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    required: false,
    hidden: true,
  })
  title: never;

  @TagField({
    hidden: true,
  })
  tags: never;


  @RatingField({
    options: ToyhouseMaturityOptions,
    required: true,
    section: 'common', order: 1
  })
  rating: SubmissionRating;

  @BooleanField({
    label: 'nudity',
    span: 4,
    section: 'common', order: 2
  })
  nudity: boolean;

  @BooleanField({
    label: 'gore',
    span: 4,
    section: 'common', order: 2
  })
  gore: boolean;

  @BooleanField({
    label: 'sensitiveContent',
    span: 4,
    section: 'common', order: 2
  })
  sensitiveContent: boolean;

  @TextField<ToyhouseFileSubmission>({
    label: 'contentWarning',
    span: 12,
    maxLength: 200,
    hidden: false,
    showWhen: [['sensitiveContent', [true]]],
    section: 'common', order: 3
  })
  contentWarning: string;

  @DescriptionField({
    label: 'description',
    descriptionType: DescriptionType.PLAINTEXT,
    required: false,
    maxDescriptionLength: 255,
    section: 'common', order: 4
  })
  description: DescriptionValue;


  @SelectField<ToyhouseAccountData>({
    label: 'characters',
    allowMultiple: true,
    required: true,
    options: [],
    derive: [
      {
        key: 'characters',
        populate: 'options',
      },
    ],
  })
  characters: string[];

  @TextField({
    label: 'artistName',
    required: true,
    span: 6,
  })
  artistName: string;

  @TextField<ToyhouseFileSubmission>({
    label: 'offSiteArtistUrl',
    required: false,
    span: 6,
  })
  offSiteArtistUrl?: string;

  @SelectField({ 
    label: 'authorizedViewers',
    options: ToyhousePrivacyOptions,
    defaultValue: '0',
    span: 4,
  })
  authorizedViewers: string;

  @SelectField({ 
    label: 'publicViewers',
    options: ToyhousePrivacyOptions,
    defaultValue: '0',
    span: 4,
  })
  publicViewers: string;

  @SelectField({ 
    label: 'watermark',
    options: ToyhouseWatermarkOptions,
    defaultValue: '1',
    span: 4,
  })
  watermark: string;
}



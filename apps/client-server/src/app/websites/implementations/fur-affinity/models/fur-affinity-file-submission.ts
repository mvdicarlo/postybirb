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
import { FurAffinityAccountData } from './fur-affinity-account-data';
import { FurAffinityCategories } from './fur-affinity-categories';
import { FurAffinitySpecies } from './fur-affinity-species-options';
import { FurAffinityThemes } from './fur-affinity-themes';

export class FurAffinityFileSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 60 })
  title: string;

  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue;

  @TagField({
    maxTagLength: 500,
    spaceReplacer: '_',
  })
  tags: TagValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'General' },
      { value: SubmissionRating.MATURE, label: 'Mature' },
      { value: SubmissionRating.ADULT, label: 'Adult' },
    ],
  })
  rating: SubmissionRating;

  @SelectField({
    label: 'category',
    defaultValue: '1',
    options: FurAffinityCategories,
    section: 'website',
    span: 6,
  })
  category: string;

  @SelectField({
    label: 'theme',
    defaultValue: '1',
    options: FurAffinityThemes,
    section: 'website',
    span: 6,
  })
  theme: string;

  @SelectField({
    label: 'species',
    defaultValue: '1',
    options: FurAffinitySpecies,
    section: 'website',
    span: 6,
  })
  species: string;

  @SelectField({
    label: 'gender',
    defaultValue: '0',
    options: [
      { value: '0', label: 'Any' },
      { value: '2', label: 'Male' },
      { value: '3', label: 'Female' },
      { value: '4', label: 'Herm' },
      { value: '11', label: 'Intersex' },
      { value: '8', label: 'Trans (Male)' },
      { value: '9', label: 'Trans (Female)' },
      { value: '10', label: 'Non-Binary' },
      { value: '6', label: 'Multiple characters' },
      { value: '7', label: 'Other / Not Specified' },
    ],
    section: 'website',
    span: 6,
  })
  gender: string;

  @SelectField<FurAffinityAccountData>({
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
    span: 6,
  })
  folders: string[];

  @BooleanField({
    label: 'disableComments',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  disableComments: boolean;

  @BooleanField({
    label: 'scraps',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  scraps: boolean;
}

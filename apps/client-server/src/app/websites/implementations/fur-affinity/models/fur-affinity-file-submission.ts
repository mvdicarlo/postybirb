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
import { FurAffinityAccountData } from './fur-affinity-account-data';
import { FurAffinityCategories } from './fur-affinity-categories';
import { FurAffinitySpecies } from './fur-affinity-species-options';
import { FurAffinityThemes } from './fur-affinity-themes';

export class FurAffinityFileSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 60 })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @TagField({
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'General' },
      { value: SubmissionRating.MATURE, label: 'Mature' },
      { value: SubmissionRating.ADULT, label: 'Adult' },
    ],
  })
  rating: SubmissionRating = SubmissionRating.GENERAL;

  @SelectField({
    required: true,
    label: 'category',
    options: FurAffinityCategories,
    section: 'website',
    span: 6,
  })
  category = '1';

  @SelectField({
    required: true,
    label: 'theme',
    options: FurAffinityThemes,
    section: 'website',
    span: 6,
  })
  theme = '1';

  @SelectField({
    required: true,
    label: 'species',
    options: FurAffinitySpecies,
    section: 'website',
    span: 6,
  })
  species = '1';

  @SelectField({
    required: true,
    label: 'gender',
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
  gender = '0';

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
    span: 12,
  })
  folders: string[] = [];

  @BooleanField({
    label: 'disableComments',
    section: 'website',
    span: 6,
  })
  disableComments = false;

  @BooleanField({
    label: 'scraps',
    section: 'website',
    span: 6,
  })
  scraps = false;
}

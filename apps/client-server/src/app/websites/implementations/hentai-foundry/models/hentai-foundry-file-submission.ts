import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TextField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { HentaiFoundryCategories } from './hentai-foundry-categories';

export class HentaiFoundryFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.BBCODE,
  })
  description: DescriptionValue;

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
    required: true,
    defaultValue: '',
    options: HentaiFoundryCategories,
    section: 'website',
    span: 6,
  })
  category: string;

  @SelectField({
    label: 'nudity',
    defaultValue: '0',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Mild Nudity' },
      { value: '2', label: 'Moderate Nudity' },
      { value: '3', label: 'Explicit Nudity' },
    ],
    section: 'website',
    span: 6,
  })
  nudityRating: string;

  @SelectField({
    label: 'violence',
    defaultValue: '0',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Comic or Mild Violence' },
      { value: '2', label: 'Moderate Violence' },
      { value: '3', label: 'Explicit or Graphic Violence' },
    ],
    section: 'website',
    span: 6,
  })
  violenceRating: string;

  @SelectField({
    label: 'profanity',
    defaultValue: '0',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Mild Profanity' },
      { value: '2', label: 'Moderate Profanity' },
      { value: '3', label: 'Proliferous or Severe Profanity' },
    ],
    section: 'website',
    span: 6,
  })
  profanityRating: string;

  @SelectField({
    label: 'racism',
    defaultValue: '0',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Mild Racist themes or content' },
      { value: '2', label: 'Racist themes or content' },
      { value: '3', label: 'Strong racist themes or content' },
    ],
    section: 'website',
    span: 6,
  })
  racismRating: string;

  @SelectField({
    label: 'sexualContent',
    defaultValue: '0',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Mild suggestive content' },
      { value: '2', label: 'Moderate suggestive or sexual content' },
      { value: '3', label: 'Explicit or adult sexual content' },
    ],
    section: 'website',
    span: 6,
  })
  sexRating: string;

  @SelectField({
    label: 'spoilers',
    defaultValue: '0',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Mild Spoiler Warning' },
      { value: '2', label: 'Moderate Spoiler Warning' },
      { value: '3', label: 'Major Spoiler Warning' },
    ],
    section: 'website',
    span: 6,
  })
  spoilersRating: string;

  @SelectField({
    label: 'media',
    defaultValue: '0',
    options: [
      // Traditional media - Drawings
      { value: '1', label: 'Charcoal' },
      { value: '2', label: 'Colored Pencil / Crayon' },
      { value: '3', label: 'Ink or markers' },
      { value: '4', label: 'Oil pastels' },
      { value: '5', label: 'Graphite pencil' },
      { value: '6', label: 'Other drawing' },
      // Traditional media - Paintings
      { value: '11', label: 'Airbrush' },
      { value: '12', label: 'Acrylics' },
      { value: '13', label: 'Oils' },
      { value: '14', label: 'Watercolor' },
      { value: '15', label: 'Other painting' },
      // Traditional media - Crafts / Physical art
      { value: '21', label: 'Plushies' },
      { value: '22', label: 'Sculpture' },
      { value: '23', label: 'Other crafts' },
      // Digital media (CG)
      { value: '31', label: '3D modelling' },
      { value: '33', label: 'Digital drawing or painting' },
      { value: '36', label: 'MS Paint' },
      { value: '32', label: 'Oekaki' },
      { value: '34', label: 'Pixel art' },
      { value: '35', label: 'Other digital art' },
      { value: '0', label: 'Unspecified' },
    ],
    section: 'website',
    span: 6,
  })
  media: string;

  @TextField({
    label: 'timeTaken',
    maxLength: 50,
    section: 'website',
    span: 6,
  })
  timeTaken: string;

  @TextField({
    label: 'reference',
    section: 'website',
    span: 6,
  })
  reference: string;

  @BooleanField({
    label: 'scraps',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  scraps: boolean;

  @BooleanField({
    label: 'disableComments',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  disableComments: boolean;

  @BooleanField({
    label: 'yaoi',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  yaoi: boolean;

  @BooleanField({
    label: 'yuri',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  yuri: boolean;

  @BooleanField({
    label: 'teen',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  teen: boolean;

  @BooleanField({
    label: 'guro',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  guro: boolean;

  @BooleanField({
    label: 'furry',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  furry: boolean;

  @BooleanField({
    label: 'beast',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  beast: boolean;

  @BooleanField({
    label: 'male',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  male: boolean;

  @BooleanField({
    label: 'female',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  female: boolean;

  @BooleanField({
    label: 'futa',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  futa: boolean;

  @BooleanField({
    label: 'other',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  other: boolean;

  @BooleanField({
    label: 'scat',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  scat: boolean;

  @BooleanField({
    label: 'incest',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  incest: boolean;

  @BooleanField({
    label: 'rape',
    defaultValue: false,
    section: 'website',
    span: 6,
  })
  rape: boolean;
}

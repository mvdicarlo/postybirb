import {
  BooleanField,
  DescriptionField,
  NumberField,
  RatingField,
  SelectField,
  TitleField,
} from '@postybirb/form-builder';
import {
  Adore34AccountData,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class Adore34MessageSubmission extends BaseWebsiteOptions {
  @TitleField({ minLength: 1, maxLength: 150 })
  declare title: string;

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    required: false,
    maxDescriptionLength: 1500,
  })
  declare description: DescriptionValue;

  @RatingField({ hidden: true, required: false })
  declare rating: SubmissionRating;

  @SelectField({
    label: 'visibility',
    required: true,
    options: [
      { value: 'all', label: 'Public' },
      { value: 'subscribers', label: 'Subscribers' },
      { value: 'tiers', label: 'Specific tiers' },
    ],
    section: 'website',
    span: 6,
  })
  visibility: 'all' | 'subscribers' | 'tiers' = 'subscribers';

  @SelectField<
    Adore34AccountData & Pick<Adore34MessageSubmission, 'visibility'>
  >({
    label: 'accessTiers',
    allowMultiple: true,
    options: [],
    derive: [{ key: 'tiers', populate: 'options' }],
    customDerive(_, options) {
      this.required = options.visibility === 'tiers';
      this.minSelected = this.required ? 1 : 0;
    },
    enableWhen: [['visibility', ['tiers']]],
    section: 'website',
    span: 6,
  })
  tiers: string[] = [];

  @BooleanField({
    label: 'allowComments',
    section: 'website',
    span: 6,
  })
  commentsEnabled = true;

  @BooleanField({
    label: 'notify',
    section: 'website',
    span: 6,
  })
  notifyFansOnPublish = true;

  @BooleanField({
    label: 'allowPurchases',
    section: 'website',
    span: 6,
  })
  isPurchasable = false;

  @NumberField<Adore34MessageSubmission>({
    label: 'priceCredits',
    min: 3,
    max: 300,
    enableWhen: [['isPurchasable', [true]]],
    section: 'website',
    span: 6,
  })
  price = 3;

  @BooleanField({
    label: 'inspiredBySaga',
    section: 'website',
    span: 6,
  })
  inspiredBySaga = false;
}

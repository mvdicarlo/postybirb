/* eslint-disable no-param-reassign */
import { SubmissionRating } from '@postybirb/types';
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

export type RatingOption = {
  label: string;
  value: SubmissionRating | undefined;
};

type ExtraOptions = {
  options: RatingOption[];
  layout?: 'vertical' | 'horizontal';
};

export const RatingField = createFieldDecorator<SubmissionRating, ExtraOptions>(
  'rating'
)({
  defaults: {
    label: 'rating',
    layout: 'horizontal',
    formField: 'rating',
    defaultValue: undefined,
    options: [
      {
        label: 'General',
        value: SubmissionRating.GENERAL,
      },
      {
        label: 'Mature',
        value: SubmissionRating.MATURE,
      },
      {
        label: 'Adult',
        value: SubmissionRating.ADULT,
      },
      {
        label: 'Extreme',
        value: SubmissionRating.EXTREME,
      },
    ],
  },
});

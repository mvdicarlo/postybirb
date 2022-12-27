/* eslint-disable no-param-reassign */
import { SubmissionRating } from '@postybirb/types';
import 'reflect-metadata';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata';

type RatingFormField = 'rating';
const TYPE_KEY = 'rating';

export type RatingOption = {
  label: string;
  value: SubmissionRating | undefined;
};

export type RatingFieldType<T extends PrimitiveRecord = PrimitiveRecord> =
  FieldType<T, SubmissionRating | undefined, RatingFormField> & {
    options: RatingOption[];
    layout?: 'vertical' | 'horizontal';
  };

export function RatingField<T extends PrimitiveRecord>(
  options: RatingFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  options.formField = TYPE_KEY;
  options.layout = options.layout ?? 'horizontal';
  return (target, propertyKey: any) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

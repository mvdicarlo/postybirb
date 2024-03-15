/* eslint-disable no-param-reassign */
import { DescriptionValue } from '@postybirb/types';
import 'reflect-metadata';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata';

type DescriptionFormField = 'description';
const TYPE_KEY = 'description';

export type DescriptionFieldType<T extends PrimitiveRecord = PrimitiveRecord> =
  FieldType<T, DescriptionValue, DescriptionFormField> & {
    inline?: boolean;
  };

export function DescriptionField<T extends PrimitiveRecord>(
  options: DescriptionFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  if (!options.formField) {
    options.formField = 'description';
  }
  if (!options.i18nLabel) {
    options.i18nLabel = 'form.descriptions';
  }
  return (target, propertyKey) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

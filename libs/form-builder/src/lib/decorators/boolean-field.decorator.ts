/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata';

type BooleanFormField = 'switch' | 'checkbox';
const TYPE_KEY = 'boolean';

export type BooleanFieldType<T extends PrimitiveRecord = PrimitiveRecord> =
  FieldType<T, boolean, BooleanFormField>;

export function BooleanField<T extends PrimitiveRecord>(
  options: BooleanFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  if (!options.formField) {
    options.formField = 'switch';
  }
  return (target, propertyKey: any) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { Primitive } from 'type-fest';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata.util';

type RadioFormField = 'radio';
const TYPE_KEY = 'radio';

export type RadioOption = {
  label: string;
  value: Primitive;
};

export type RadioFieldType<T extends PrimitiveRecord> = FieldType<
  T,
  string,
  RadioFormField
> & {
  options: RadioOption[];
};

export function RadioField<T extends PrimitiveRecord>(
  options: RadioFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  options.formField = 'radio';
  return (target, propertyKey: string) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

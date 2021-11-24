import 'reflect-metadata';
import { Primitive } from 'type-fest';
import { FieldType } from '../types/field.type';
import { assignMetadata } from '../utils/assign-metadata.util';

type RadioFormField = 'radio';
const TYPE_KEY = 'radio';

export type RadioOption = {
  label: string;
  value: Primitive;
};

export type RadioFieldType<T extends Record<string, Primitive>> = FieldType<
  T,
  string,
  RadioFormField
> & {
  options: RadioOption[];
};

export function RadioField<T extends Record<string, Primitive>>(
  options: RadioFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  options.formField = 'radio';
  return (target, propertyKey: string) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

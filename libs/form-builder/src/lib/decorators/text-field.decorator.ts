import 'reflect-metadata';
import { Primitive } from 'type-fest';
import { FieldType } from '../types/field.type';
import { assignMetadata } from '../utils/assign-metadata.util';

type TextFormField = 'input' | 'textarea';
const TYPE_KEY = 'text';

export type TextFieldType<T extends Record<string, Primitive>> = FieldType<
  T,
  string,
  TextFormField
>;

export function TextField<T extends Record<string, Primitive>>(
  options: TextFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  if (!options.formField) {
    options.formField = 'input';
  }
  return (target, propertyKey: string) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

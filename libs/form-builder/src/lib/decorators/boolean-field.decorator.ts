import 'reflect-metadata';
import { Primitive } from 'type-fest';
import { FieldType } from '../types/field.type';
import { assignMetadata } from '../utils/assign-metadata.util';

type BooleanFormField = 'switch' | 'checkbox';
const TYPE_KEY = 'boolean';

export type BooleanFieldType<T extends Record<string, Primitive>> = FieldType<
  T,
  boolean,
  BooleanFormField
>;

export function BooleanField<T extends Record<string, Primitive>>(
  options: BooleanFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  if (!options.formField) {
    options.formField = 'switch';
  }
  return (target, propertyKey: string) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

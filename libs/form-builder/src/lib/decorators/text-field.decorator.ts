/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata';

type TextFormField = 'input' | 'textarea';
const TYPE_KEY = 'text';

export type TextFieldType<T extends PrimitiveRecord = PrimitiveRecord> =
  FieldType<T, string, TextFormField> & {
    maxLength?: number;
  };

export function TextField<T extends PrimitiveRecord>(
  options: TextFieldType<T>,
): PropertyDecorator {
  options.type = TYPE_KEY;
  options.maxLength = options.maxLength ?? undefined;
  if (!options.formField) {
    options.formField = 'input';
  }
  return (target, propertyKey) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

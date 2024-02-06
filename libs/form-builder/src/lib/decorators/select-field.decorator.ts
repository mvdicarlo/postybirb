/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata';

type SelectFormField = 'select';
const TYPE_KEY = 'select';

export type SelectOption = {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  options?: SelectOption[];
};

export type SelectFieldType<T extends PrimitiveRecord = PrimitiveRecord> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FieldType<T, any, SelectFormField> & {
    options: SelectOption[];
    allowMultiple: boolean;
  };

export function SelectField<T extends PrimitiveRecord>(
  options: SelectFieldType<T>
): PropertyDecorator {
  options.type = TYPE_KEY;
  options.formField = 'select';
  options.allowMultiple = options.allowMultiple ?? false;
  return (target, propertyKey: string) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}

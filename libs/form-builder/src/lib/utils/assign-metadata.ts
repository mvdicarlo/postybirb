/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { METADATA_KEY } from '../../constants';
import { FieldAggregateType } from '../types';
import { FormBuilderMetadata } from '../types/form-builder-metadata';
import { PrimitiveRecord } from '../types/primitive-record';

export function assignMetadata<T extends PrimitiveRecord>(
  target: object,
  propertyKey: string | symbol,
  fieldKey: string,
  options: FieldAggregateType<T>,
): void {
  if (typeof propertyKey === 'symbol') return;

  const proto = target.constructor;
  const fields: FormBuilderMetadata<T> =
    Reflect.getMetadata(METADATA_KEY, proto) || {};

  if (!fields[propertyKey]) {
    fields[propertyKey] = options;
  }

  if (options.row === undefined) {
    options.row = Number.MAX_SAFE_INTEGER;
  }

  if (options.col === undefined) {
    options.col = 0;
  }

  fields[propertyKey] = options;
  Reflect.defineMetadata(METADATA_KEY, fields, proto);
}

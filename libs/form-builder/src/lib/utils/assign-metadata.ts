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
  options: FieldAggregateType<T>
): void {
  if (typeof propertyKey === 'symbol') return;

  const proto = target.constructor;
  const fields: FormBuilderMetadata<T> =
    Reflect.getMetadata(METADATA_KEY, proto) || {};

  if (!fields[propertyKey]) {
    fields[propertyKey] = [];
  }

  if (options.column === undefined) {
    options.column = 0;
  }

  if (options.row === undefined) {
    options.row = 1000;
  }

  if (!fields[propertyKey].some((f) => f.type === fieldKey)) {
    fields[propertyKey].push(options);
    Reflect.defineMetadata(METADATA_KEY, fields, proto);
  }
}

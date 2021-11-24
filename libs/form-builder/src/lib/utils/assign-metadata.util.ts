import 'reflect-metadata';
import { METADATA_KEY } from '../../constants';
import { FieldAggregateType } from '../types/field-aggregate.type';
import { FormBuilderMetadata } from '../types/form-builder-metadata.type';

export function assignMetadata<T extends FieldAggregateType<any>>(
  target: object,
  propertyKey: string,
  fieldKey: string,
  options: T
): void {
  const proto = target.constructor;
  const fields: FormBuilderMetadata<any> =
    Reflect.getMetadata(METADATA_KEY, proto) || {};

  if (!fields[propertyKey]) {
    fields[propertyKey] = [];
  }

  if (!fields[propertyKey].some((f) => f.type === fieldKey)) {
    fields[propertyKey].push(options);
    Reflect.defineMetadata(METADATA_KEY, fields, proto);
  }
}

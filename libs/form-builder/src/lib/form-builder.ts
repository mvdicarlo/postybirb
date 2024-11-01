import 'reflect-metadata';
import { METADATA_KEY } from '../constants';
import { FormBuilderMetadata } from './types/form-builder-metadata';
import { PrimitiveRecord } from './types/primitive-record';

export function formBuilder(
  target: object,
  data: PrimitiveRecord,
): FormBuilderMetadata {
  const metadata = JSON.parse(
    JSON.stringify(Reflect.getMetadata(METADATA_KEY, target.constructor)),
  ) as FormBuilderMetadata;

  for (const value of Object.values(metadata)) {
    if (value.defaultFrom) value.defaultValue = data[value.defaultFrom];
  }

  return metadata;
}

export * from './decorators';
export * from './types';

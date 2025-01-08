import 'reflect-metadata';
import { FormBuilderMetadata } from './types/form-builder-metadata';
import { PrimitiveRecord } from './types/primitive-record';
import { getMetadataKey } from './utils/assign-metadata';

export function formBuilder(
  target: object,
  data: PrimitiveRecord,
): FormBuilderMetadata {
  const key = getMetadataKey(target.constructor.name);
  const sym = target[key];
  if (!sym) throw new Error('No metadata symbol found');
  const metadata = JSON.parse(
    JSON.stringify(Reflect.getMetadata(sym, target.constructor)),
  ) as FormBuilderMetadata;

  for (const value of Object.values(metadata)) {
    if (value.defaultFrom) value.defaultValue = data[value.defaultFrom];
  }

  return metadata;
}

export * from './decorators';
export * from './types';


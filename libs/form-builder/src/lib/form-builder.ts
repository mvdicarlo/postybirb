import 'reflect-metadata';
import { FormBuilderMetadata } from './types/form-builder-metadata';
import { PrimitiveRecord } from './types/primitive-record';
import { getMetadataKey, getParentMetadataKeys } from './utils/assign-metadata';

export function formBuilder(
  target: object,
  data: PrimitiveRecord,
): FormBuilderMetadata {
  const key = getMetadataKey(target.constructor.name);
  let sym = target[key];
  if (!sym) {
    // Handle case where a class extends another class with metadata, but provides no metadata itself
    const parentKeys = getParentMetadataKeys(target);
    for (const parentKey of parentKeys) {
      sym = target[parentKey];
      if (sym) break;
    }
  }
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


/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { FormBuilderMetadata } from './types/form-builder-metadata';
import { PrimitiveRecord } from './types/primitive-record';
import { getMetadataKey, getParentMetadataKeys } from './utils/assign-metadata';

export function formBuilder(
  target: object,
  data: PrimitiveRecord,
): FormBuilderMetadata {
  const key = getMetadataKey(target.constructor.name);
  let sym: symbol = (target as any)[key];
  if (!sym) {
    // Handle case where a class extends another class with metadata, but provides no metadata itself
    const parentKeys = getParentMetadataKeys(target);
    for (const parentKey of parentKeys) {
      sym = (target as any)[parentKey];
      if (sym) break;
    }
  }

  if (!sym) throw new Error('No metadata symbol found');

  const rawMetadata = Reflect.getMetadata(
    sym,
    target.constructor,
  ) as FormBuilderMetadata;

  const metadata = JSON.parse(
    JSON.stringify(rawMetadata),
  ) as FormBuilderMetadata;

  for (const [valueKey, value] of Object.entries(metadata)) {
    if (value.defaultFrom) value.defaultValue = data[value.defaultFrom];
    value.derive?.forEach((d) => {
      (value as PrimitiveRecord)[d.populate] = data[d.key];
    });

    const customDerive = rawMetadata[valueKey]?.customDerive;
    if (customDerive) {
      (
        customDerive as (metadata: FormBuilderMetadata, target: object) => void
      ).call(value, metadata, target);
    }
  }

  return metadata;
}

export * from './decorators';
export * from './types';

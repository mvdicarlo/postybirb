import 'reflect-metadata';
import { METADATA_KEY } from '../constants';
import { FormBuilderMetadata } from './types/form-builder-metadata';
import { PrimitiveRecord } from './types/primitive-record';

export function formBuilder<T extends PrimitiveRecord>(
  target: object,
  data: T,
): FormBuilderMetadata<T> {
  const metadata: FormBuilderMetadata<T> = JSON.parse(
    JSON.stringify(Reflect.getMetadata(METADATA_KEY, target.constructor)),
  );

  Object.values(metadata).forEach((value) => {
    if (value.defaultFrom) {
      // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-explicit-any
      value.defaultValue = data[value.defaultFrom] as any;
    }
  });

  return metadata;
}

export * from './decorators';
export * from './types';

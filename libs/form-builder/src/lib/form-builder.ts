import 'reflect-metadata';
import { Primitive } from 'type-fest';
import { METADATA_KEY } from '../constants';
import { FormBuilderMetadata } from './types/form-builder-metadata.type';

export function formBuilder<T extends Record<string, Primitive>>(
  target: object,
  data: T
): FormBuilderMetadata<T> {
  const metadata: FormBuilderMetadata<T> = JSON.parse(
    JSON.stringify(Reflect.getMetadata(METADATA_KEY, target.constructor))
  );

  Object.values(metadata).forEach((value) => {
    value
      .filter((v) => Boolean(v.defaultFrom))
      .forEach((v) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-param-reassign
        v.defaultValue = (data[v.defaultFrom] ?? v.defaultValue) as any;
      });
  });

  return metadata;
}

export * from './decorators';
export * from './types';

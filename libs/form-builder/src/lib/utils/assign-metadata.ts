/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { METADATA_KEY } from '../../constants';
import { FieldAggregateType, FieldType } from '../types';
import { FormBuilderMetadata } from '../types/form-builder-metadata';
import { PrimitiveRecord } from '../types/primitive-record';

export type PartialOnly<T, V extends string | number | symbol> = Omit<T, V> &
  Partial<{
    [P in V]: V extends keyof T ? T[V] : never;
  }>;

/**
 * Describes types that can be narrowed
 */
export type Narrowable = string | number | bigint | boolean;
export type NarrowRaw<A> =
  | (A extends [] ? [] : never)
  | (A extends Narrowable ? A : never)
  | {
      // eslint-disable-next-line @typescript-eslint/ban-types
      [K in keyof A]: A[K] extends Function ? A[K] : NarrowRaw<A[K]>;
    };

export function createFieldDecorator<
  FieldValue,
  ExtraFields extends object = object,
  TypeKey extends string = string
>(type: TypeKey) {
  /**
   * Function used to finalize field decorator options
   */
  return function create<
    Defaults extends
      | Partial<FieldType<FieldValue, TypeKey> & ExtraFields>
      | unknown
  >(field: {
    defaults?: Defaults;
    onCreate?: (options: FieldType<FieldValue, TypeKey>) => void;
    onDecorate?: PropertyDecorator;
  }) {
    function decorator<Data extends unknown | PrimitiveRecord = unknown>(
      options: PartialOnly<
        FieldType<FieldValue, TypeKey, Data> & ExtraFields,
        keyof Defaults
      >
    ): PropertyDecorator {
      if (field.defaults)
        for (const [key, value] of Object.entries(field.defaults)) {
          options[key] ??= value;
        }

      const fieldOptions = options as FieldType<FieldValue, TypeKey, Data> &
        ExtraFields;

      fieldOptions.type ??= type;
      fieldOptions.row ??= Number.MAX_SAFE_INTEGER;
      fieldOptions.col ??= 0;

      field.onCreate?.(
        fieldOptions as unknown as FieldType<FieldValue, TypeKey>
      );

      return (target, propertyKey) => {
        if (typeof propertyKey === 'symbol') return;

        const proto = target.constructor;
        const fields: FormBuilderMetadata =
          Reflect.getMetadata(METADATA_KEY, proto) || {};

        fields[propertyKey] = fieldOptions as unknown as FieldAggregateType;

        Reflect.defineMetadata(METADATA_KEY, fields, proto);
        field.onDecorate?.(target, propertyKey);
      };
    }

    return decorator as typeof decorator & {
      field: FieldType<FieldValue, TypeKey> & ExtraFields;
    };
  };
}

export type ExtractFieldTypeFromDecorator<D> = D extends { field: infer T }
  ? T
  : D;

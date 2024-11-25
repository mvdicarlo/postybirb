/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { METADATA_KEY } from '../../constants';
import { FieldAggregateType, FieldType } from '../types';
import { FormBuilderMetadata } from '../types/form-builder-metadata';
import { PrimitiveRecord } from '../types/primitive-record';

/**
 * Make keys V in type T partial
 */
export type PartialOnly<T, V extends string | number | symbol> = Omit<T, V> &
  Partial<{
    [P in V]: V extends keyof T ? T[V] : never;
  }>;

/**
 * Field decorator creator superfunction
 *
 * @param type - Type of the decorator to create. Will be set to the {@link FieldType.type} field.
 * @returns Creator function
 */
export function createFieldDecorator<
  FieldValue,
  ExtraFields extends object = object,
  TypeKey extends string = string,
>(type: TypeKey) {
  // Note that we cant just create one function that returns a decorator
  // because if you specify generics by hand, e.g. createFieldDecorator<SomeType>('type', {})
  // it will stop narrowing all other generic types such as Defaults
  /**
   * Function used to finalize field decorator options
   */
  return function create<
    Defaults extends
      | Partial<FieldType<FieldValue, TypeKey> & ExtraFields>
      | unknown,
  >(field: {
    /**
     * Default values of the field. If label or defaultValue are provided, they will be not required when using a decorator
     *
     * Example:
     * ```ts
     * const WithDefaults = createFieldDecorator('with')({
     *   defaults: {
     *     label: 'title',
     *     defaultValue: ''
     *   }
     * })
     * const WithoutDefaults = createFieldDecorator('without')({})
     *
     * class TestType {
     *   WithDefaults({})
     *   field1: string
     *
     *   WithoutDefaults({}) // Error! Missing properties label and defaultValue
     *   field2: string
     * }
     *
     * ```
     */
    defaults?: Defaults;
    /**
     * Function that being called on decorator applying. Can be used to change options or to change applied value
     *
     * @param options - Options to be changed
     */
    onCreate?: (
      options: FieldType<FieldValue, TypeKey>,
      target: object,
      propertyKey: string | symbol,
    ) => void;
  }) {
    function decorator<Data extends unknown | PrimitiveRecord = unknown>(
      options: PartialOnly<
        FieldType<FieldValue, TypeKey, Data> & ExtraFields,
        keyof Defaults
      >,
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

      return (target, propertyKey) => {
        if (typeof propertyKey === 'symbol') return;

        const proto = target.constructor;
        const fields: FormBuilderMetadata =
          Reflect.getMetadata(METADATA_KEY, proto) || {};

        field.onCreate?.(
          fieldOptions as unknown as FieldType<FieldValue, TypeKey>,
          target,
          propertyKey,
        );

        fields[propertyKey] = fieldOptions as unknown as FieldAggregateType;

        Reflect.defineMetadata(METADATA_KEY, fields, proto);
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

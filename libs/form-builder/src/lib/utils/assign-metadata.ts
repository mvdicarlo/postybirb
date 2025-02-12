/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { Class } from 'type-fest';
import { METADATA_KEY } from '../../constants';
import { FieldAggregateType, FieldType } from '../types';
import { FormBuilderMetadata } from '../types/form-builder-metadata';
import { PrimitiveRecord } from '../types/primitive-record';

export function getMetadataKey(name: string) {
  return `__${METADATA_KEY}__${name}__`;
}

export function getParentMetadataKeys(proto: object) {
  const chain = [];
  let currentProto = proto.constructor;
  while (currentProto && currentProto.name) {
    chain.push(currentProto.name);
    currentProto = Object.getPrototypeOf(currentProto);
  }
  return chain.map((c) => getMetadataKey(c));
}

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
      target: any,
      propertyKey: string | symbol,
    ) => void;
  }) {
    function decorator<Data extends unknown | PrimitiveRecord = unknown>(
      options: PartialOnly<
        FieldType<FieldValue, TypeKey, Data> & ExtraFields,
        keyof Defaults
      >,
    ): PropertyDecorator {
      if (field.defaults) {
        for (const [key, value] of Object.entries(field.defaults)) {
          (options as any)[key] ??= value;
        }
      }

      const fieldOptions = options as FieldType<FieldValue, TypeKey, Data> &
        ExtraFields;

      fieldOptions.type ??= type;

      return (target: any, propertyKey) => {
        if (typeof propertyKey === 'symbol') return;

        const proto = target.constructor;
        // eslint-disable-next-line new-cap
        const obj = new (proto as Class<object>)();
        const propKeyValue = (obj as any)[propertyKey];
        if (propKeyValue !== undefined) {
          /*
           * This is to allow for setting of defaults through field setting
           * @Field()
           * field = 'value' // makes defaultValue = 'value'
           */
          fieldOptions.defaultValue = propKeyValue as FieldValue;
        }

        const chain = [];
        let currentProto = proto;
        while (currentProto && currentProto.name) {
          chain.push(currentProto.name);
          currentProto = Object.getPrototypeOf(currentProto);
        }
        const key = getMetadataKey(proto.name);
        if (!target[key]) {
          target[key] = Symbol(key);
        }
        const sym = target[key];
        const fields: FormBuilderMetadata =
          Reflect.getMetadata(sym, proto) || {};

        field.onCreate?.(
          fieldOptions as unknown as FieldType<FieldValue, TypeKey>,
          target,
          propertyKey,
        );

        const chainedFields = chain
          .reverse()
          .filter((c) => c !== target.constructor.name)
          .map((c) => Reflect.getMetadata(target[getMetadataKey(c)], proto));

        // Iterate over all chained parent classes and merge their fields
        // Uniqueness is maintained by use of the Symbol(key)
        for (const c of chainedFields) {
          if (c) {
            Object.entries(c).forEach(([fieldKey, value]) => {
              if (value !== undefined) {
                fields[fieldKey] = Object.assign(
                  JSON.parse(JSON.stringify(value)),
                  fields[fieldKey] ?? {},
                ) as unknown as FieldAggregateType;
              }
            });
          }
        }

        fields[propertyKey] = Object.assign(
          fields[propertyKey] ?? {},
          fieldOptions,
        ) as unknown as FieldAggregateType;

        fields[propertyKey].row ??= Number.MAX_SAFE_INTEGER;
        fields[propertyKey].col ??= 0;

        Reflect.defineMetadata(sym, fields, proto);
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

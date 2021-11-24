import { FieldAggregateType } from './field-aggregate.type';
import { Primitive } from 'type-fest';

export type FormBuilderMetadata<T extends Record<string, Primitive>> = Record<
  string,
  FieldAggregateType<T>[]
>;

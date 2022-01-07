import { Primitive } from 'type-fest';
import { FieldAggregateType } from './field-aggregate.type';

export type FormBuilderMetadata<
  T extends Record<string, Primitive> = Record<string, Primitive>
> = Record<string, FieldAggregateType<T>[]>;

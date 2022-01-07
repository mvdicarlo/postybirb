import { Primitive } from 'type-fest';
import { BooleanFieldType, RadioFieldType, TextFieldType } from '../decorators';

export type FieldAggregateType<
  T extends Record<string, Primitive> = Record<string, Primitive>
> = BooleanFieldType<T> | TextFieldType<T> | RadioFieldType<T>;

import { FieldAggregateType } from './field-aggregate';
import { PrimitiveRecord } from './primitive-record';

export type FormBuilderMetadata<T extends PrimitiveRecord> = Record<
  string,
  FieldAggregateType<T>[]
>;
